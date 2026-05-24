export type OutputFormat = 'image/png' | 'image/jpeg' | 'image/webp';

export type UploadedImage = {
  file: File;
  url: string;
  name: string;
  width: number;
  height: number;
};

export type BackgroundRemovalSettings = {
  enabled: boolean;
  tolerance: number;
  feather: number;
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
