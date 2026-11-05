export type OutputFormat = 'image/png' | 'image/jpeg' | 'image/webp';

export type BackgroundMode = 'auto' | 'custom';
export type ReplacementType = 'transparent' | 'color';

export type UploadedImage = {
  file: File;
  url: string;
  name: string;
  width: number;
  height: number;
};

export type BackgroundRemovalSettings = {
  enabled: boolean;
  mode?: BackgroundMode;
  customColor?: string;
  replacementType?: ReplacementType;
  replacementColor?: string;
  tolerance: number;
  feather: number;
  defringe?: number;
  filterEdgeWhiteness?: boolean;
  edgeWhiteness?: number;
  whitenessEdgeOnly?: boolean;
};

export type ExportSettings = {
  format: OutputFormat;
  quality: number;
};

export type TransformSettings = {
  background: BackgroundRemovalSettings;
  export: ExportSettings;
};

export type TransformResult = {
  blob: Blob;
  url: string;
  fileName: string;
};
