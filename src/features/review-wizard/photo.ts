import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import type { WizardPhoto } from "./types";

/** The longest edge of an uploaded photo, in pixels. Keeps storage and transfer small. */
export const PHOTO_MAX_EDGE = 1600;
/** JPEG quality for uploads. */
export const PHOTO_QUALITY = 0.7;

/**
 * How to shrink an image so its longest edge is `max`, keeping its shape. Null when it is already
 * small enough: photos are never scaled up.
 */
export function resizeTarget(
  width: number,
  height: number,
  max: number = PHOTO_MAX_EDGE,
): { width: number } | { height: number } | null {
  if (!(width > 0) || !(height > 0)) return null;
  if (Math.max(width, height) <= max) return null;
  return width >= height ? { width: max } : { height: max };
}

export type PickResult =
  | { status: "ok"; photo: WizardPhoto }
  | { status: "cancelled" }
  | { status: "denied" }
  | { status: "failed" };

/** Takes or chooses one photo and shrinks it for upload. */
export async function pickPhoto(source: "camera" | "library"): Promise<PickResult> {
  try {
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return { status: "denied" };
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1 };
    const picked =
      source === "camera"
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (picked.canceled) return { status: "cancelled" };

    const asset = picked.assets[0];
    const context = ImageManipulator.ImageManipulator.manipulate(asset.uri);
    const target = resizeTarget(asset.width, asset.height);
    if (target) context.resize(target);
    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({
      format: ImageManipulator.SaveFormat.JPEG,
      compress: PHOTO_QUALITY,
    });
    return { status: "ok", photo: { uri: saved.uri, width: saved.width, height: saved.height } };
  } catch {
    return { status: "failed" };
  }
}
