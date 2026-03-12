import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import jpegJs from 'jpeg-js';

// Analyse a small grid — big enough to find the hole, small enough to be fast
const GRID = 40;

// Hole must be darker than this brightness (0-255) to be considered
const DARK_THRESHOLD = 60;

// Only look in the upper portion of the frame — the hole is ahead of the ball
const SEARCH_TOP    = 0.08;
const SEARCH_BOTTOM = 0.72;

/**
 * Tries to find the golf hole in a photo.
 *
 * @param {string} photoUri     - URI from CameraView.takePictureAsync()
 * @param {number} screenWidth  - device screen width
 * @param {number} screenHeight - device screen height
 * @returns {{ x: number, y: number } | null}  screen-space position, or null if not found
 */
export async function detectHoleInPhoto(photoUri, screenWidth, screenHeight) {
  try {
    // Resize to a tiny grid for fast pixel analysis
    const resized = await manipulateAsync(
      photoUri,
      [{ resize: { width: GRID, height: GRID } }],
      { base64: true, format: SaveFormat.JPEG, compress: 0.5 },
    );

    // Decode JPEG to raw RGBA pixels
    const raw = Buffer.from(resized.base64, 'base64');
    const { data, width, height } = jpegJs.decode(raw, { useTArray: true });

    // Scan the search zone for the darkest pixel cluster
    const yStart = Math.floor(height * SEARCH_TOP);
    const yEnd   = Math.floor(height * SEARCH_BOTTOM);

    // Build a brightness map and find a cluster of dark pixels
    // (a single dark pixel could be noise; we want a small dark region)
    let bestScore = Infinity;
    let bestX = width / 2;
    let bestY = height * 0.25; // fallback: upper quarter

    for (let cy = yStart + 1; cy < yEnd - 1; cy++) {
      for (let cx = 1; cx < width - 1; cx++) {
        // Average brightness of a 3×3 kernel centred on (cx, cy)
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const idx = ((cy + dy) * width + (cx + dx)) * 4;
            sum += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          }
        }
        const avg = sum / 9;
        if (avg < bestScore) {
          bestScore = avg;
          bestX = cx;
          bestY = cy;
        }
      }
    }

    // If the darkest region isn't dark enough, bail out
    if (bestScore > DARK_THRESHOLD) return null;

    // Map grid coords → screen coords
    return {
      x: (bestX / width)  * screenWidth,
      y: (bestY / height) * screenHeight,
    };
  } catch (err) {
    console.warn('[holeDetection] failed:', err?.message ?? err);
    return null;
  }
}
