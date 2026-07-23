import { AlphaType, ColorType, Skia, type SkImage } from '@shopify/react-native-skia';

import type { Rect } from './groundShadow';

export type AlphaBounds = { norm: Rect; aspect: number };

const SAMPLE = 96; // long edge of the downscaled scan buffer — cheap to read back
const ALPHA_MIN = 12; // treat alpha below this as transparent

/**
 * Normalized bounding box (0..1 within the image) of a cutout's opaque pixels,
 * plus the source aspect ratio — used to place the ground shadow under the real
 * car instead of at a fixed guess. Runs once per image on a tiny offscreen
 * surface (a ~96px scan is negligible). Returns null on any failure or a fully
 * transparent image, so callers fall back to the static ellipse (no regression).
 */
export function computeAlphaBounds(image: SkImage): AlphaBounds | null {
  try {
    const iw = image.width();
    const ih = image.height();
    if (iw <= 0 || ih <= 0) return null;

    const scale = Math.min(SAMPLE / iw, SAMPLE / ih, 1);
    const sw = Math.max(1, Math.round(iw * scale));
    const sh = Math.max(1, Math.round(ih * scale));

    const surface = Skia.Surface.MakeOffscreen(sw, sh);
    if (!surface) return null;
    surface.getCanvas().drawImageRect(
      image,
      Skia.XYWHRect(0, 0, iw, ih),
      Skia.XYWHRect(0, 0, sw, sh),
      Skia.Paint()
    );
    const px = surface.makeImageSnapshot().readPixels(0, 0, {
      width: sw,
      height: sh,
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    }) as Uint8Array | null;
    if (!px) return null;

    let minX = sw;
    let minY = sh;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        if (px[(y * sw + x) * 4 + 3] > ALPHA_MIN) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return null; // fully transparent

    return {
      norm: {
        x: minX / sw,
        y: minY / sh,
        width: (maxX - minX + 1) / sw,
        height: (maxY - minY + 1) / sh,
      },
      aspect: iw / ih,
    };
  } catch {
    return null; // any Skia hiccup → static-ellipse fallback
  }
}

/**
 * Load an encoded image from a file URI and compute its alpha bounds. Used at
 * cut-out time to persist bounds into the doc (for the published viewer).
 * Best-effort: returns null on any failure.
 */
export async function computeAlphaBoundsFromUri(uri: string): Promise<AlphaBounds | null> {
  try {
    const data = await Skia.Data.fromURI(uri);
    const image = Skia.Image.MakeImageFromEncoded(data);
    return image ? computeAlphaBounds(image) : null;
  } catch {
    return null;
  }
}
