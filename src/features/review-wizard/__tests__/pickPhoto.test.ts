import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { pickPhoto } from "../photo";

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

describe("pickPhoto", () => {
  it("does not open the camera without permission", async () => {
    permission.mockResolvedValue({ granted: false });
    expect(await pickPhoto("camera")).toEqual({ status: "denied" });
    expect(camera).not.toHaveBeenCalled();
  });

  it("reports a cancelled pick", async () => {
    library.mockResolvedValue({ canceled: true, assets: [] });
    expect(await pickPhoto("library")).toEqual({ status: "cancelled" });
  });

  it("shrinks a large photo and returns the saved file", async () => {
    camera.mockResolvedValue(asset(4000, 3000));
    expect(await pickPhoto("camera")).toEqual({
      status: "ok",
      photo: { uri: "file:///out.jpg", width: 1600, height: 1200 },
    });
    expect(resize).toHaveBeenCalledWith({ width: 1600 });
  });

  it("does not resize a photo that is already small", async () => {
    library.mockResolvedValue(asset(800, 600));
    await pickPhoto("library");
    expect(resize).not.toHaveBeenCalled();
    expect(saveAsync).toHaveBeenCalledWith({ format: "jpeg", compress: 0.7 });
  });

  it("reports a failure instead of throwing", async () => {
    library.mockRejectedValue(new Error("no gallery"));
    expect(await pickPhoto("library")).toEqual({ status: "failed" });
  });
});
