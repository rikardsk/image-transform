import { describe, expect, it, vi } from 'vitest';
import { clampZoom, handleWheelZoom } from './useZoomPan';

describe('clampZoom', () => {
  it('clamps zoom between min 0.5 and max 5', () => {
    expect(clampZoom(0.2)).toBe(0.5);
    expect(clampZoom(6)).toBe(5);
    expect(clampZoom(1.75)).toBe(1.75);
  });
});

describe('handleWheelZoom', () => {
  it('calls zoomIn when scrolling up (negative deltaY)', () => {
    const zoomIn = vi.fn();
    const zoomOut = vi.fn();

    handleWheelZoom(-100, zoomIn, zoomOut);
    expect(zoomIn).toHaveBeenCalled();
    expect(zoomOut).not.toHaveBeenCalled();
  });

  it('calls zoomOut when scrolling down (positive deltaY)', () => {
    const zoomIn = vi.fn();
    const zoomOut = vi.fn();

    handleWheelZoom(100, zoomIn, zoomOut);
    expect(zoomOut).toHaveBeenCalled();
    expect(zoomIn).not.toHaveBeenCalled();
  });
});
