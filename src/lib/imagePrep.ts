import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

// Cap the longest edge before upload: raw sensor photos (12–48 MP, several MB
// each) would otherwise ship as-is — expensive over metered mobile data and
// heavy to decode on low-RAM devices. ~2000px keeps listing-grade quality.
export const MAX_UPLOAD_EDGE = 2000;

export async function prepareForUpload(
  uri: string,
  width?: number,
  height?: number
): Promise<{ uri: string; resized: boolean }> {
  const longest = Math.max(width ?? 0, height ?? 0);
  if (longest > 0 && longest <= MAX_UPLOAD_EDGE) return { uri, resized: false };
  const resize = (height ?? 0) >= (width ?? 0) ? { height: MAX_UPLOAD_EDGE } : { width: MAX_UPLOAD_EDGE };
  const result = await manipulateAsync(uri, [{ resize }], { compress: 0.8, format: SaveFormat.JPEG });
  return { uri: result.uri, resized: true };
}

/** Best-effort delete of a local temp file (camera shot, resized copy, export). */
export async function deleteLocal(uri: string | null | undefined): Promise<void> {
  if (!uri || !uri.startsWith('file:')) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // cache cleanup must never break the flow that triggered it
  }
}
