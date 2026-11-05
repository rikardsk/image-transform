import type { BackgroundRemovalSettings, OutputFormat, TransformSettings, UploadedImage } from '../types';

const formatExtensions: Record<OutputFormat, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export type Rgba = {
  red: number;
  green: number;
  blue: number;
  alpha: number;
};

export const loadImage = async (file: File): Promise<UploadedImage> => {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;

  await image.decode();

  return {
    file,
    url,
    name: file.name,
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
};

export const transformImage = async (
  source: UploadedImage,
  settings: TransformSettings,
): Promise<Blob> => {
  const image = new Image();
  image.src = source.url;
  await image.decode();

  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Could not create image canvas');
  }

  context.drawImage(image, 0, 0);

  if (settings.background.enabled) {
    removeSampledBackground(context, canvas, settings.background);
    applyDefringe(context, canvas, settings.background);
    applyReplacementBackground(context, canvas, settings.background);
  }

  return await exportCanvas(canvas, settings.export.format, settings.export.quality);
};

export const applyReplacementBackground = (
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  settings: BackgroundRemovalSettings,
): void => {
  if (settings.replacementType !== 'color' || !settings.replacementColor) {
    return;
  }

  context.save();
  context.globalCompositeOperation = 'destination-over';
  context.fillStyle = settings.replacementColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.restore();
};

export const createExportFileName = (name: string, format: OutputFormat): string => {
  const extension = formatExtensions[format];
  const baseName = name.replace(/\.[^/.]+$/, '');

  return `${baseName || 'transformed-image'}.${extension}`;
};

const exportCanvas = async (
  canvas: HTMLCanvasElement,
  format: OutputFormat,
  quality: number,
): Promise<Blob> => {
  const normalizedQuality = Math.min(1, Math.max(0.1, quality / 100));

  return await new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not export image'));
          return;
        }

        resolve(blob);
      },
      format,
      normalizedQuality,
    );
  });
};

const removeSampledBackground = (
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  settings: BackgroundRemovalSettings,
): void => {
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  const sample = resolveTargetColor(pixels, canvas.width, canvas.height, settings);

  for (let index = 0; index < pixels.length; index += 4) {
    const distance = getColorDistance(pixels, index, sample);
    const opacity = getBackgroundOpacity(distance, settings.tolerance, settings.feather);
    pixels[index + 3] = Math.round(pixels[index + 3] * opacity);
  }

  context.putImageData(imageData, 0, 0);
};

export const applyDefringe = (
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  settings: BackgroundRemovalSettings,
): void => {
  const strength = settings.defringe ?? 0;
  if (strength <= 0) return;

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  const bg = resolveTargetColor(pixels, canvas.width, canvas.height, settings);

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const idx = (y * canvas.width + x) * 4;
      const alpha = pixels[idx + 3];
      if (alpha === 0 || (alpha > 250 && !isBoundaryPixel(pixels, x, y, canvas.width, canvas.height))) {
        continue;
      }
      const fg = findForegroundNeighbor(pixels, x, y, canvas.width, canvas.height);
      const [r, g, b] = decontaminateRgb(pixels[idx], pixels[idx + 1], pixels[idx + 2], alpha, bg, fg, strength);
      pixels[idx] = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
    }
  }

  context.putImageData(imageData, 0, 0);
};

const findForegroundNeighbor = (
  pixels: Uint8ClampedArray,
  x: number,
  y: number,
  width: number,
  height: number,
): Rgba | null => {
  let redSum = 0;
  let greenSum = 0;
  let blueSum = 0;
  let count = 0;

  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const idx = (ny * width + nx) * 4;
      if (pixels[idx + 3] >= 220) {
        redSum += pixels[idx];
        greenSum += pixels[idx + 1];
        blueSum += pixels[idx + 2];
        count++;
      }
    }
  }

  if (count === 0) return null;
  return { red: redSum / count, green: greenSum / count, blue: blueSum / count, alpha: 255 };
};

export const decontaminateRgb = (
  r: number,
  g: number,
  b: number,
  alpha: number,
  bg: Rgba,
  fg: Rgba | null,
  strength: number,
): [number, number, number] => {
  const factor = Math.min(1, Math.max(0, strength / 100));
  if (fg) {
    const blendWeight = factor * (1 - (alpha / 255) * 0.4);
    return [
      Math.round(r * (1 - blendWeight) + fg.red * blendWeight),
      Math.round(g * (1 - blendWeight) + fg.green * blendWeight),
      Math.round(b * (1 - blendWeight) + fg.blue * blendWeight),
    ];
  }

  const whiteFraction = (1 - alpha / 255) * factor;
  const divisor = Math.max(0.1, 1 - whiteFraction);
  return [
    Math.min(255, Math.max(0, Math.round((r - whiteFraction * bg.red) / divisor))),
    Math.min(255, Math.max(0, Math.round((g - whiteFraction * bg.green) / divisor))),
    Math.min(255, Math.max(0, Math.round((b - whiteFraction * bg.blue) / divisor))),
  ];
};

const isBoundaryPixel = (
  pixels: Uint8ClampedArray,
  x: number,
  y: number,
  width: number,
  height: number,
): boolean => {
  const neighbors = [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1],
  ];

  return neighbors.some(([nx, ny]) => {
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) return true;
    return pixels[(ny * width + nx) * 4 + 3] < 220;
  });
};

export const resolveTargetColor = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  settings: BackgroundRemovalSettings,
): Rgba => {
  if (settings.mode === 'custom' && settings.customColor) {
    return hexToRgba(settings.customColor);
  }

  return getCornerSample(pixels, width, height);
};

export const getCornerSample = (pixels: Uint8ClampedArray, width: number, height: number): Rgba => {
  const corners = [
    getPixel(pixels, 0),
    getPixel(pixels, (width - 1) * 4),
    getPixel(pixels, (width * (height - 1)) * 4),
    getPixel(pixels, ((width * height) - 1) * 4),
  ];

  return getConsensusSample(corners);
};

export const getConsensusSample = (corners: Rgba[]): Rgba => {
  if (corners.length === 0) {
    return { red: 255, green: 255, blue: 255, alpha: 255 };
  }

  const medoid = findMedoid(corners);
  const inliers = corners.filter((corner) => getRgbaDistance(corner, medoid) <= 45);

  return averagePixels(inliers.length > 0 ? inliers : [medoid]);
};

export const findMedoid = (samples: Rgba[]): Rgba => {
  let bestSample = samples[0];
  let minTotalDistance = Infinity;

  for (const sample of samples) {
    const totalDist = samples.reduce((sum, other) => sum + getRgbaDistance(sample, other), 0);
    if (totalDist < minTotalDistance) {
      minTotalDistance = totalDist;
      bestSample = sample;
    }
  }

  return bestSample;
};

export const getRgbaDistance = (a: Rgba, b: Rgba): number => {
  const red = a.red - b.red;
  const green = a.green - b.green;
  const blue = a.blue - b.blue;

  return Math.sqrt((red * red) + (green * green) + (blue * blue));
};

export const cleanHex = (input: string): string => {
  return input.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
};

export const normalizeHexColor = (input: string): string | null => {
  const cleaned = cleanHex(input);
  if (cleaned.length === 6) {
    return `#${cleaned.toLowerCase()}`;
  }

  if (cleaned.length === 3) {
    const [red, green, blue] = cleaned;
    return `#${red}${red}${green}${green}${blue}${blue}`.toLowerCase();
  }

  return null;
};

export const hexToRgba = (hex: string): Rgba => {
  const normalized = normalizeHexColor(hex);
  if (!normalized) {
    return { red: 255, green: 255, blue: 255, alpha: 255 };
  }

  const num = parseInt(normalized.slice(1), 16);
  return {
    red: (num >> 16) & 255,
    green: (num >> 8) & 255,
    blue: num & 255,
    alpha: 255,
  };
};

const getPixel = (pixels: Uint8ClampedArray, index: number): Rgba => ({
  red: pixels[index],
  green: pixels[index + 1],
  blue: pixels[index + 2],
  alpha: pixels[index + 3],
});

const averagePixels = (pixels: Rgba[]): Rgba => {
  const totals = pixels.reduce(
    (sum, pixel) => ({
      red: sum.red + pixel.red,
      green: sum.green + pixel.green,
      blue: sum.blue + pixel.blue,
      alpha: sum.alpha + pixel.alpha,
    }),
    { red: 0, green: 0, blue: 0, alpha: 0 },
  );

  return {
    red: totals.red / pixels.length,
    green: totals.green / pixels.length,
    blue: totals.blue / pixels.length,
    alpha: totals.alpha / pixels.length,
  };
};

const getColorDistance = (pixels: Uint8ClampedArray, index: number, sample: Rgba): number => {
  const red = pixels[index] - sample.red;
  const green = pixels[index + 1] - sample.green;
  const blue = pixels[index + 2] - sample.blue;

  return Math.sqrt((red * red) + (green * green) + (blue * blue));
};

export const getBackgroundOpacity = (distance: number, tolerance: number, feather: number): number => {
  if (distance <= tolerance) {
    return 0;
  }

  if (feather <= 0 || distance >= tolerance + feather) {
    return 1;
  }

  return (distance - tolerance) / feather;
};
