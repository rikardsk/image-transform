import { describe, expect, it } from 'vitest';
import { applyShiftEdgeAtPoint, isChokableEdge } from './shiftEdgeBrush';
import type { Rgba } from './imageTransforms';

const whiteBg: Rgba = { red: 255, green: 255, blue: 255, alpha: 255 };

describe('isChokableEdge', () => {
  it('identifies boundary pixel touching transparency', () => {
    // 3x3 image, center is solid, corners/edges are transparent
    const width = 3;
    const height = 3;
    const pixels = new Uint8ClampedArray(width * height * 4);
    // set center (1,1) to opaque
    const centerIdx = (1 * width + 1) * 4;
    pixels[centerIdx] = 50;
    pixels[centerIdx + 1] = 50;
    pixels[centerIdx + 2] = 50;
    pixels[centerIdx + 3] = 255;

    expect(isChokableEdge(pixels, 1, 1, width, height, whiteBg)).toBe(true);
  });

  it('rejects deep interior pixel with all solid neighbors', () => {
    // 3x3 all solid
    const width = 3;
    const height = 3;
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 30;
      pixels[i + 1] = 40;
      pixels[i + 2] = 30;
      pixels[i + 3] = 255;
    }

    expect(isChokableEdge(pixels, 1, 1, width, height, whiteBg)).toBe(false);
  });
});

describe('applyShiftEdgeAtPoint', () => {
  it('clears edge pixel alpha within brush radius', () => {
    const width = 5;
    const height = 5;
    const pixels = new Uint8ClampedArray(width * height * 4);
    // center pixel at (2,2) is semi-transparent edge
    const idx = (2 * width + 2) * 4;
    pixels[idx] = 200;
    pixels[idx + 1] = 200;
    pixels[idx + 2] = 200;
    pixels[idx + 3] = 180;

    const changed = applyShiftEdgeAtPoint(pixels, width, height, 2, 2, 3, whiteBg);
    expect(changed).toBe(true);
    expect(pixels[idx + 3]).toBe(0);
  });
});
