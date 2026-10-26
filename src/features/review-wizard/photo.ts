import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import type { WizardPhoto } from "./types";

/** The longest edge of an uploaded photo, in pixels. Keeps storage and transfer small. */
export const PHOTO_MAX_EDGE = 1600;
/** JPEG quality for uploads. */
export const PHOTO_QUALITY = 0.7;
/** The longest edge of the small copy shown in lists and grids. */
export const THUMB_MAX_EDGE = 480;
export const THUMB_QUALITY = 0.6;

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
  | { status: "ok"; photos: WizardPhoto[] }
  | { status: "cancelled" }
  | { status: "denied" }
  | { status: "failed" };

/** Shrinks one picked image to upload size, and makes its thumbnail from the same source. */
async function prepare(asset: ImagePicker.ImagePickerAsset): Promise<WizardPhoto> {
  const render = async (max: number, compress: number) => {
    const context = ImageManipulator.ImageManipulator.manipulate(asset.uri);
    const target = resizeTarget(asset.width, asset.height, max);
    if (target) context.resize(target);
    const rendered = await context.renderAsync();
    return rendered.saveAsync({ format: ImageManipulator.SaveFormat.JPEG, compress });
  };
  const [full, thumb] = await Promise.all([
    render(PHOTO_MAX_EDGE, PHOTO_QUALITY),
    render(THUMB_MAX_EDGE, THUMB_QUALITY),
  ]);
  return { uri: full.uri, width: full.width, height: full.height, thumbUri: thumb.uri };
}

/**
 * Takes one photo, or chooses up to `remaining` from the library, and shrinks each for upload. The
 * camera gives one at a time. Every photo is resized on its own.
 */
export async function pickPhotos(
  source: "camera" | "library",
  remaining: number = 1,
): Promise<PickResult> {
  try {
    if (remaining < 1) return { status: "cancelled" };
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return { status: "denied" };
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1 };
    const picked =
      source === "camera"
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync({
            ...options,
            allowsMultipleSelection: remaining > 1,
            selectionLimit: remaining,
          });
    if (picked.canceled) return { status: "cancelled" };

    const photos = await Promise.all(picked.assets.slice(0, remaining).map(prepare));
    return { status: "ok", photos };
  } catch {
    return { status: "failed" };
  }
}
