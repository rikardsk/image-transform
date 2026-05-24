import type { OutputFormat, TransformSettings, UploadedImage } from '../types';

const formatExtensions: Record<OutputFormat, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

type Rgba = {
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
    removeSampledBackground(context, canvas, settings.background.tolerance, settings.background.feather);
  }

  return await exportCanvas(canvas, settings.export.format, settings.export.quality);
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
  tolerance: number,
  feather: number,
): void => {
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  const sample = getCornerSample(pixels, canvas.width, canvas.height);

  for (let index = 0; index < pixels.length; index += 4) {
    const distance = getColorDistance(pixels, index, sample);
    const opacity = getBackgroundOpacity(distance, tolerance, feather);
    pixels[index + 3] = Math.round(pixels[index + 3] * opacity);
  }

  context.putImageData(imageData, 0, 0);
};

const getCornerSample = (pixels: Uint8ClampedArray, width: number, height: number): Rgba => {
  const corners = [
    getPixel(pixels, 0),
    getPixel(pixels, (width - 1) * 4),
    getPixel(pixels, (width * (height - 1)) * 4),
    getPixel(pixels, ((width * height) - 1) * 4),
  ];

  return averagePixels(corners);
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

const getBackgroundOpacity = (distance: number, tolerance: number, feather: number): number => {
  if (distance <= tolerance) {
    return 0;
  }

  if (feather <= 0 || distance >= tolerance + feather) {
    return 1;
  }

  return (distance - tolerance) / feather;
};
