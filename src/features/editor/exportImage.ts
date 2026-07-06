import { ImageFormat, useCanvasRef } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system/legacy';

export type CanvasRef = ReturnType<typeof useCanvasRef>;

/**
 * Flatten the Skia canvas (background + cutout + hotspots) into a single image
 * file and return its file:// URI. PNG preserves transparency (for the
 * "transparent" background); JPEG produces a smaller opaque file.
 */
export async function exportCanvas(
  canvasRef: CanvasRef,
  format: 'png' | 'jpeg' = 'png'
): Promise<string> {
  const image = canvasRef.current?.makeImageSnapshot();
  if (!image) {
    throw new Error('The canvas is not ready yet — please try again in a moment.');
  }

  const skFormat = format === 'jpeg' ? ImageFormat.JPEG : ImageFormat.PNG;
  const base64 = image.encodeToBase64(skFormat, 100);
  const ext = format === 'jpeg' ? 'jpg' : 'png';
  const uri = `${FileSystem.cacheDirectory}carstudio-export-${Date.now()}.${ext}`;

  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return uri;
}
