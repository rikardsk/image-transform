import { DragEvent, useRef, useState } from 'react';
import { FileImage, ImagePlus, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { useZoomPan, useZoomWheel } from '../hooks/useZoomPan';
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

const PreviewSurface = ({ previewUrl }: { previewUrl: string | null }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomControls = useZoomPan(previewUrl);

  useZoomWheel(
    containerRef,
    zoomControls.zoomIn,
    zoomControls.zoomOut,
    Boolean(previewUrl),
  );

  if (!previewUrl) {
    return <EmptyPreview />;
  }

  return (
    <div
      ref={containerRef}
      className={`preview-surface ${zoomControls.zoom > 1 ? (zoomControls.isPanning ? 'panning' : 'can-pan') : ''}`}
      onMouseDown={(event) => zoomControls.startPan(event.clientX, event.clientY)}
      onMouseLeave={zoomControls.endPan}
      onMouseMove={(event) => zoomControls.updatePan(event.clientX, event.clientY)}
      onMouseUp={zoomControls.endPan}
    >
      <img
        alt="Current preview"
        draggable={false}
        src={previewUrl}
        style={{
          transform: `translate(${zoomControls.pan.x}px, ${zoomControls.pan.y}px) scale(${zoomControls.zoom})`,
          transition: zoomControls.isPanning ? 'none' : 'transform 120ms ease-out',
        }}
      />
      <ZoomControls
        zoom={zoomControls.zoom}
        onReset={zoomControls.resetZoom}
        onZoomIn={zoomControls.zoomIn}
        onZoomOut={zoomControls.zoomOut}
      />
    </div>
  );
};

const EmptyPreview = () => (
  <div className="preview-surface">
    <div className="empty-preview">
      <FileImage size={44} />
      <span>Your preview will appear here</span>
    </div>
  </div>
);

type ZoomControlsProps = {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
};

const ZoomControls = ({ zoom, onZoomIn, onZoomOut, onReset }: ZoomControlsProps) => (
  <div className="zoom-toolbar" role="toolbar" aria-label="Image zoom controls">
    <button
      aria-label="Zoom out"
      className="zoom-btn"
      disabled={zoom <= 0.5}
      title="Zoom out"
      type="button"
      onClick={onZoomOut}
    >
      <ZoomOut size={16} />
    </button>
    <span className="zoom-level">{Math.round(zoom * 100)}%</span>
    <button
      aria-label="Zoom in"
      className="zoom-btn"
      disabled={zoom >= 5}
      title="Zoom in"
      type="button"
      onClick={onZoomIn}
    >
      <ZoomIn size={16} />
    </button>
    <button
      aria-label="Reset zoom"
      className="zoom-btn"
      title="Reset zoom (100%)"
      type="button"
      onClick={onReset}
    >
      <RotateCcw size={15} />
    </button>
  </div>
);

const handleDragOver = (
  event: DragEvent<HTMLLabelElement>,
  setIsDragging: (isDragging: boolean) => void,
): void => {
  event.preventDefault();
  setIsDragging(true);
};
