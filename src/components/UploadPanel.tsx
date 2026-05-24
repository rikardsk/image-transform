import { DragEvent, useState } from 'react';
import { FileImage, ImagePlus } from 'lucide-react';
import type { UploadedImage } from '../types';

type UploadPanelProps = {
  image: UploadedImage | null;
  imageMeta: string;
  previewUrl: string | null;
  onFileSelect: (file: File | null) => Promise<void>;
};

export const UploadPanel = ({
  image,
  imageMeta,
  previewUrl,
  onFileSelect,
}: UploadPanelProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    await onFileSelect(event.dataTransfer.files[0] ?? null);
  };

  return (
    <div className="upload-panel">
      <label
        className={`dropzone ${isDragging ? 'dragging' : ''}`}
        onDragOver={(event) => handleDragOver(event, setIsDragging)}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          accept="image/*"
          type="file"
          onChange={(event) => onFileSelect(event.target.files?.[0] ?? null)}
        />
        <ImagePlus size={36} />
        <strong>Drop in an image</strong>
        <span>or click to browse files</span>
      </label>
      <PreviewSurface previewUrl={previewUrl} />
      <div className="file-meta">
        <span>{image?.name ?? 'Ready for upload'}</span>
        <span>{imageMeta}</span>
      </div>
    </div>
  );
};

const PreviewSurface = ({ previewUrl }: { previewUrl: string | null }) => (
  <div className="preview-surface">
    {previewUrl ? (
      <img src={previewUrl} alt="Current preview" />
    ) : (
      <div className="empty-preview">
        <FileImage size={44} />
        <span>Your preview will appear here</span>
      </div>
    )}
  </div>
);

const handleDragOver = (
  event: DragEvent<HTMLLabelElement>,
  setIsDragging: (isDragging: boolean) => void,
): void => {
  event.preventDefault();
  setIsDragging(true);
};
