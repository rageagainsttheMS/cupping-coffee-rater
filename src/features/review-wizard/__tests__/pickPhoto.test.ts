import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { pickPhotos } from "../photo";

jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock("expo-image-manipulator", () => ({
  SaveFormat: { JPEG: "jpeg" },
  ImageManipulator: { manipulate: jest.fn() },
}));

const camera = ImagePicker.launchCameraAsync as jest.Mock;
const library = ImagePicker.launchImageLibraryAsync as jest.Mock;
const permission = ImagePicker.requestCameraPermissionsAsync as jest.Mock;
const manipulate = ImageManipulator.ImageManipulator.manipulate as unknown as jest.Mock;

const resize = jest.fn();
const saveAsync = jest.fn();

beforeEach(() => {
  jest.resetAllMocks();
  permission.mockResolvedValue({ granted: true });
  saveAsync.mockResolvedValue({ uri: "file:///out.jpg", width: 1600, height: 1200 });
  manipulate.mockReturnValue({ resize, renderAsync: async () => ({ saveAsync }) });
});

const asset = (width: number, height: number) => ({
  canceled: false,
  assets: [{ uri: "file:///in.jpg", width, height }],
});

describe("pickPhotos", () => {
  it("does not open the camera without permission", async () => {
    permission.mockResolvedValue({ granted: false });
    expect(await pickPhotos("camera")).toEqual({ status: "denied" });
    expect(camera).not.toHaveBeenCalled();
  });

  it("reports a cancelled pick", async () => {
    library.mockResolvedValue({ canceled: true, assets: [] });
    expect(await pickPhotos("library")).toEqual({ status: "cancelled" });
  });

  it("shrinks a large photo and returns the saved file", async () => {
    camera.mockResolvedValue(asset(4000, 3000));
    expect(await pickPhotos("camera")).toEqual({
      status: "ok",
      photos: [{ uri: "file:///out.jpg", width: 1600, height: 1200, thumbUri: "file:///out.jpg" }],
    });
    expect(resize).toHaveBeenCalledWith({ width: 1600 });
    expect(resize).toHaveBeenCalledWith({ width: 480 });
  });

  it("does not resize a photo that is already small", async () => {
    library.mockResolvedValue(asset(800, 600));
    await pickPhotos("library");
    expect(resize).not.toHaveBeenCalledWith({ width: 1600 });
    expect(saveAsync).toHaveBeenCalledWith({ format: "jpeg", compress: 0.7 });
  });

  it("lets the library pick several, up to the room left, and shrinks each", async () => {
    library.mockResolvedValue({
      canceled: false,
      assets: [
        { uri: "file:///1.jpg", width: 4000, height: 3000 },
        { uri: "file:///2.jpg", width: 3000, height: 4000 },
        { uri: "file:///3.jpg", width: 800, height: 600 },
      ],
    });
    const result = await pickPhotos("library", 2);
    expect(library).toHaveBeenCalledWith(
      expect.objectContaining({ allowsMultipleSelection: true, selectionLimit: 2 }),
    );
    expect(result.status === "ok" && result.photos).toHaveLength(2);
    expect(resize).toHaveBeenCalledWith({ height: 1600 });
  });

  it("takes one photo at a time with the camera", async () => {
    camera.mockResolvedValue(asset(800, 600));
    await pickPhotos("camera", 3);
    expect(camera.mock.calls[0][0].allowsMultipleSelection).toBeUndefined();
  });

  it("does not open the picker when the review is full", async () => {
    expect(await pickPhotos("library", 0)).toEqual({ status: "cancelled" });
    expect(library).not.toHaveBeenCalled();
  });

  it("reports a failure instead of throwing", async () => {
    library.mockRejectedValue(new Error("no gallery"));
    expect(await pickPhotos("library")).toEqual({ status: "failed" });
  });
});
