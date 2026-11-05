import { describe, expect, it, vi } from 'vitest';
import {
  applyReplacementBackground,
  cleanHex,
  createExportFileName,
  decontaminateRgb,
  filterEdgeWhiteness,
  getBackgroundOpacity,
  getConsensusSample,
  hexToRgba,
  isNearAlphaEdge,
  isPixelWhiteOrGray,
  normalizeHexColor,
  shouldFilterEdgePixel,
  type Rgba,
} from './imageTransforms';

describe('createExportFileName', () => {
  it('replaces the extension with the selected format', () => {
    expect(createExportFileName('portrait.jpeg', 'image/webp')).toBe('portrait.webp');
  });

  it('uses a fallback name when the source name has no base', () => {
    expect(createExportFileName('.png', 'image/jpeg')).toBe('transformed-image.jpg');
  });
});

describe('getConsensusSample', () => {
  it('rejects outlier corner touching artwork and detects white background', () => {
    const white: Rgba = { red: 255, green: 255, blue: 255, alpha: 255 };
    const darkArtCorner: Rgba = { red: 25, green: 30, blue: 35, alpha: 255 };
    const corners = [white, white, darkArtCorner, white];

    const sample = getConsensusSample(corners);
    expect(sample.red).toBe(255);
    expect(sample.green).toBe(255);
    expect(sample.blue).toBe(255);
  });

  it('handles empty corner list gracefully', () => {
    const sample = getConsensusSample([]);
    expect(sample.red).toBe(255);
  });
});

describe('cleanHex', () => {
  it('strips non-hex characters and limits length to 6', () => {
    expect(cleanHex('#3B82F6')).toBe('3B82F6');
    expect(cleanHex('#12345678')).toBe('123456');
    expect(cleanHex('g-h-i-!#ff')).toBe('ff');
  });
});

describe('normalizeHexColor', () => {
  it('normalizes 6-digit hex with and without hash', () => {
    expect(normalizeHexColor('#3B82F6')).toBe('#3b82f6');
    expect(normalizeHexColor('3b82f6')).toBe('#3b82f6');
  });

  it('expands 3-digit shorthand', () => {
    expect(normalizeHexColor('#fff')).toBe('#ffffff');
    expect(normalizeHexColor('000')).toBe('#000000');
  });

  it('returns null for invalid hex values', () => {
    expect(normalizeHexColor('invalid')).toBeNull();
    expect(normalizeHexColor('#12345')).toBeNull();
    expect(normalizeHexColor('#1234567')).toBeNull();
  });
});

describe('hexToRgba', () => {
  it('parses standard 6-character hex', () => {
    expect(hexToRgba('#ffffff')).toEqual({ red: 255, green: 255, blue: 255, alpha: 255 });
    expect(hexToRgba('#000000')).toEqual({ red: 0, green: 0, blue: 0, alpha: 255 });
  });

  it('parses short 3-character hex', () => {
    expect(hexToRgba('#fff')).toEqual({ red: 255, green: 255, blue: 255, alpha: 255 });
  });

  it('defaults safely on invalid hex', () => {
    expect(hexToRgba('not-a-color')).toEqual({ red: 255, green: 255, blue: 255, alpha: 255 });
  });
});

describe('getBackgroundOpacity', () => {
  it('returns 0 for distances within tolerance', () => {
    expect(getBackgroundOpacity(10, 42, 18)).toBe(0);
  });

  it('returns 1 for distances outside tolerance + feather', () => {
    expect(getBackgroundOpacity(70, 42, 18)).toBe(1);
  });

  it('feathers between tolerance and tolerance + feather', () => {
    expect(getBackgroundOpacity(51, 42, 18)).toBeCloseTo(0.5, 2);
  });
});

describe('applyReplacementBackground', () => {
  it('does nothing when replacementType is transparent', () => {
    const context = {
      save: vi.fn(),
      restore: vi.fn(),
      fillRect: vi.fn(),
      globalCompositeOperation: 'source-over',
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D;
    const canvas = { width: 100, height: 100 } as HTMLCanvasElement;

    applyReplacementBackground(context, canvas, {
      enabled: true,
      replacementType: 'transparent',
      tolerance: 42,
      feather: 18,
    });

    expect(context.save).not.toHaveBeenCalled();
    expect(context.fillRect).not.toHaveBeenCalled();
  });

  it('draws background behind image when replacementType is color', () => {
    const context = {
      save: vi.fn(),
      restore: vi.fn(),
      fillRect: vi.fn(),
      globalCompositeOperation: 'source-over',
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D;
    const canvas = { width: 200, height: 150 } as HTMLCanvasElement;

    applyReplacementBackground(context, canvas, {
      enabled: true,
      replacementType: 'color',
      replacementColor: '#1e293b',
      tolerance: 42,
      feather: 18,
    });

    expect(context.save).toHaveBeenCalled();
    expect(context.globalCompositeOperation).toBe('destination-over');
    expect(context.fillStyle).toBe('#1e293b');
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 200, 150);
    expect(context.restore).toHaveBeenCalled();
  });
});

describe('decontaminateRgb', () => {
  it('blends contaminated edge pixel toward adjacent foreground neighbor', () => {
    const whiteBg: Rgba = { red: 255, green: 255, blue: 255, alpha: 255 };
    const darkBranch: Rgba = { red: 30, green: 45, blue: 20, alpha: 255 };
    const [r, g, b] = decontaminateRgb(200, 210, 195, 128, whiteBg, darkBranch, 100);

    expect(r).toBeLessThan(100);
    expect(g).toBeLessThan(100);
    expect(b).toBeLessThan(80);
  });

  it('un-mixes background color when no solid foreground neighbor exists', () => {
    const whiteBg: Rgba = { red: 255, green: 255, blue: 255, alpha: 255 };
    const [r, g, b] = decontaminateRgb(220, 220, 220, 128, whiteBg, null, 80);

    expect(r).toBeLessThan(220);
    expect(g).toBeLessThan(220);
    expect(b).toBeLessThan(220);
  });
});

describe('isPixelWhiteOrGray', () => {
  it('at 0% whiteness, matches pure white and light off-white', () => {
    expect(isPixelWhiteOrGray(255, 255, 255, 0)).toBe(true);
    expect(isPixelWhiteOrGray(235, 235, 235, 0)).toBe(true);
    expect(isPixelWhiteOrGray(210, 210, 210, 0)).toBe(false);
  });

  it('at 100% whiteness, matches down to mid/dark gray', () => {
    expect(isPixelWhiteOrGray(255, 255, 255, 100)).toBe(true);
    expect(isPixelWhiteOrGray(140, 140, 140, 100)).toBe(true);
    expect(isPixelWhiteOrGray(95, 95, 95, 100)).toBe(true);
    expect(isPixelWhiteOrGray(70, 70, 70, 100)).toBe(false);
  });

  it('rejects saturated colors even if bright', () => {
    // bright green moss
    expect(isPixelWhiteOrGray(50, 240, 50, 100)).toBe(false);
    // cyan glowing mushroom
    expect(isPixelWhiteOrGray(40, 210, 240, 100)).toBe(false);
  });
});

describe('isNearAlphaEdge', () => {
  it('returns true when a neighbor is transparent within radius', () => {
    const width = 5;
    const height = 5;
    const pixels = new Uint8ClampedArray(width * height * 4);
    // make all opaque except (0,0)
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i + 3] = 255;
    }
    pixels[3] = 0; // (0,0) is transparent

    expect(isNearAlphaEdge(pixels, 1, 1, width, height, 2)).toBe(true);
    expect(isNearAlphaEdge(pixels, 4, 4, width, height, 2)).toBe(false);
  });
});

describe('filterEdgeWhiteness', () => {
  it('when edgeOnly is false, removes matching white/gray pixels everywhere', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 3;
    canvas.height = 3;
    const context = canvas.getContext('2d')!;
    const imageData = context.createImageData(3, 3);
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = 200;
      imageData.data[i + 1] = 200;
      imageData.data[i + 2] = 200;
      imageData.data[i + 3] = 255;
    }
    context.putImageData(imageData, 0, 0);

    filterEdgeWhiteness(context, canvas, 50, false);

    const result = context.getImageData(0, 0, 3, 3).data;
    expect(result[4 * 4 + 3]).toBe(0);
  });

  it('when edgeOnly is true, protects center pixels not near transparent edges', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 20;
    canvas.height = 20;
    const context = canvas.getContext('2d')!;
    const imageData = context.createImageData(20, 20);
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = 200;
      imageData.data[i + 1] = 200;
      imageData.data[i + 2] = 200;
      imageData.data[i + 3] = 255;
    }
    // Only pixel (0,0) is transparent
    imageData.data[3] = 0;
    context.putImageData(imageData, 0, 0);

    filterEdgeWhiteness(context, canvas, 50, true);

    const result = context.getImageData(0, 0, 20, 20).data;
    // (19, 19) is far from (0,0) (radius is 8), so its alpha remains 255
    const idxFar = (19 * 20 + 19) * 4;
    expect(result[idxFar + 3]).toBe(255);
  });
});
