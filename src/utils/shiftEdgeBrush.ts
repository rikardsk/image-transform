import type { Rgba } from './imageTransforms';

export const isChokableEdge = (
  pixels: Uint8ClampedArray,
  x: number,
  y: number,
  width: number,
  height: number,
  bgSample: Rgba,
): boolean => {
  const idx = (y * width + x) * 4;
  const alpha = pixels[idx + 3];
  if (alpha === 0) return false;
  if (alpha < 240) return true;

  const red = pixels[idx] - bgSample.red;
  const green = pixels[idx + 1] - bgSample.green;
  const blue = pixels[idx + 2] - bgSample.blue;
  if (Math.sqrt(red * red + green * green + blue * blue) < 50) return true;

  const neighbors = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
  return neighbors.some(([nx, ny]) => {
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) return true;
    return pixels[(ny * width + nx) * 4 + 3] < 200;
  });
};

export const applyShiftEdgeAtPoint = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  radius: number,
  bgSample: Rgba,
): boolean => {
  let changed = false;
  const rSquared = radius * radius;
  const minX = Math.max(0, Math.floor(centerX - radius));
  const maxX = Math.min(width - 1, Math.ceil(centerX + radius));
  const minY = Math.max(0, Math.floor(centerY - radius));
  const maxY = Math.min(height - 1, Math.ceil(centerY + radius));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const distSq = (x - centerX) ** 2 + (y - centerY) ** 2;
      if (distSq > rSquared) continue;

      if (isChokableEdge(pixels, x, y, width, height, bgSample)) {
        pixels[(y * width + x) * 4 + 3] = 0;
        changed = true;
      }
    }
  }

  return changed;
};

export const createWorkingCanvas = (image: HTMLImageElement): {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
} => {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Canvas 2D context not available');
  }
  context.drawImage(image, 0, 0);
  return { canvas, context };
};

export const exportCanvasToBlob = async (canvas: HTMLCanvasElement): Promise<Blob> => {
  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to create blob from canvas'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
};
