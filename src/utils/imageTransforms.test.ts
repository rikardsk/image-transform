import { describe, expect, it } from 'vitest';
import { createExportFileName } from './imageTransforms';

describe('createExportFileName', () => {
  it('replaces the extension with the selected format', () => {
    expect(createExportFileName('portrait.jpeg', 'image/webp')).toBe('portrait.webp');
  });

  it('uses a fallback name when the source name has no base', () => {
    expect(createExportFileName('.png', 'image/jpeg')).toBe('transformed-image.jpg');
  });
});
