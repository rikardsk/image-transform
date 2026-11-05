import { DragEvent, useRef, useState } from 'react';
import {
  FileImage,
  ImagePlus,
  Move,
  Paintbrush,
  RotateCcw,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { getPixelCoords, useEdgeBrush } from '../hooks/useEdgeBrush';
import { useZoomPan, useZoomWheel } from '../hooks/useZoomPan';
import type { TransformResult, UploadedImage } from '../types';

type UploadPanelProps = {
  image: UploadedImage | null;
  imageMeta: string;
  previewUrl: string | null;
  result?: TransformResult | null;
  onFileSelect: (file: File | null) => Promise<void>;
  onResultUpdate?: (result: TransformResult) => void;
};

export const UploadPanel = ({
  image,
  imageMeta,
  previewUrl,
  result,
  onFileSelect,
  onResultUpdate,
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
      <PreviewSurface
        imageKey={image?.url ?? null}
        previewUrl={previewUrl}
        result={result}
        onResultUpdate={onResultUpdate}
      />
      <div className="file-meta">
        <span>{image?.name ?? 'Ready for upload'}</span>
        <span>{imageMeta}</span>
      </div>
    </div>
  );
};

const handleSurfaceDown = (
  e: React.MouseEvent,
  brush: ReturnType<typeof useEdgeBrush>,
  zoom: ReturnType<typeof useZoomPan>,
  img: HTMLImageElement | null,
) => {
  if (brush.activeTool === 'brush' && img) {
    const coords = getPixelCoords(e.clientX, e.clientY, img, img.naturalWidth, img.naturalHeight);
    if (coords) brush.startStroke(coords.x, coords.y);
    return;
  }
  zoom.startPan(e.clientX, e.clientY);
};

const handleSurfaceMove = (
  e: React.MouseEvent,
  brush: ReturnType<typeof useEdgeBrush>,
  zoom: ReturnType<typeof useZoomPan>,
  img: HTMLImageElement | null,
) => {
  if (brush.activeTool === 'brush' && img) {
    brush.setCursorPos({ x: e.clientX, y: e.clientY });
    const coords = getPixelCoords(e.clientX, e.clientY, img, img.naturalWidth, img.naturalHeight);
    if (coords) brush.moveStroke(coords.x, coords.y);
    return;
  }
  zoom.updatePan(e.clientX, e.clientY);
};

type BackdropType = 'checker' | 'dark' | 'white';

const PreviewSurface = ({
  imageKey,
  previewUrl,
  result,
  onResultUpdate,
}: {
  imageKey: string | null;
  previewUrl: string | null;
  result?: TransformResult | null;
  onResultUpdate?: (result: TransformResult) => void;
}) => {
  const [backdrop, setBackdrop] = useState<BackdropType>('checker');
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const zoomControls = useZoomPan(imageKey);
  const brushControls = useEdgeBrush(result ?? null, onResultUpdate);

  useZoomWheel(containerRef, zoomControls.zoomIn, zoomControls.zoomOut, Boolean(previewUrl));

  if (!previewUrl) return <EmptyPreview />;

  const isPanning = zoomControls.zoom > 1 && brushControls.activeTool === 'pan';

  return (
    <div
      ref={containerRef}
      className={`preview-surface backdrop-${backdrop} ${
        zoomControls.zoom >= 3 ? 'deep-zoom' : ''
      } ${
        brushControls.activeTool === 'brush' ? 'brush-active' : isPanning ? 'can-pan' : ''
      }`}
      onMouseDown={(e) => handleSurfaceDown(e, brushControls, zoomControls, imgRef.current)}
      onMouseLeave={() => {
        brushControls.setCursorPos(null);
        brushControls.activeTool === 'brush' ? brushControls.endStroke() : zoomControls.endPan();
      }}
      onMouseMove={(e) => handleSurfaceMove(e, brushControls, zoomControls, imgRef.current)}
      onMouseUp={() => (brushControls.activeTool === 'brush' ? brushControls.endStroke() : zoomControls.endPan())}
    >
      <img
        ref={imgRef}
        alt="Current preview"
        draggable={false}
        src={previewUrl}
        style={{
          transform: `translate(${zoomControls.pan.x}px, ${zoomControls.pan.y}px) scale(${zoomControls.zoom})`,
          transition: zoomControls.isPanning ? 'none' : 'transform 120ms ease-out',
        }}
      />
      {result && (
        <BrushToolbar
          activeTool={brushControls.activeTool}
          brushSize={brushControls.brushSize}
          canUndo={brushControls.canUndo}
          onSelectSize={brushControls.setBrushSize}
          onSelectTool={brushControls.setActiveTool}
          onUndo={brushControls.undo}
        />
      )}
      <BackdropSelector backdrop={backdrop} onChange={setBackdrop} />
      <ZoomControls
        zoom={zoomControls.zoom}
        onReset={zoomControls.resetZoom}
        onZoomIn={zoomControls.zoomIn}
        onZoomOut={zoomControls.zoomOut}
      />
      {brushControls.activeTool === 'brush' && brushControls.cursorPos && (
        <BrushCursor pos={brushControls.cursorPos} size={brushControls.brushSize} zoom={zoomControls.zoom} />
      )}
    </div>
  );
};

type BackdropSelectorProps = {
  backdrop: BackdropType;
  onChange: (backdrop: BackdropType) => void;
};

const BackdropSelector = ({ backdrop, onChange }: BackdropSelectorProps) => (
  <div className="backdrop-toolbar" role="group" aria-label="Preview backdrop">
    <button
      className={`backdrop-btn ${backdrop === 'checker' ? 'active' : ''}`}
      title="Checkerboard (Transparent)"
      type="button"
      onClick={() => onChange('checker')}
    >
      <span className="backdrop-swatch swatch-checker" />
    </button>
    <button
      className={`backdrop-btn ${backdrop === 'dark' ? 'active' : ''}`}
      title="Dark backdrop (Reveal white halo)"
      type="button"
      onClick={() => onChange('dark')}
    >
      <span className="backdrop-swatch swatch-dark" />
    </button>
    <button
      className={`backdrop-btn ${backdrop === 'white' ? 'active' : ''}`}
      title="White backdrop"
      type="button"
      onClick={() => onChange('white')}
    >
      <span className="backdrop-swatch swatch-white" />
    </button>
  </div>
);

const radiusOptions = Array.from({ length: 15 }, (_, index) => (index + 1) * 2);

type BrushToolbarProps = {
  activeTool: 'pan' | 'brush';
  brushSize: number;
  canUndo: boolean;
  onSelectTool: (tool: 'pan' | 'brush') => void;
  onSelectSize: (size: number) => void;
  onUndo: () => void;
};

const BrushRadiusControl = ({
  brushSize,
  onSelectSize,
}: {
  brushSize: number;
  onSelectSize: (size: number) => void;
}) => (
  <label className="radius-dropdown-label">
    <span>Radius</span>
    <select
      aria-label="Brush radius"
      className="brush-radius-select"
      value={brushSize}
      onChange={(e) => onSelectSize(Number(e.target.value))}
    >
      {radiusOptions.map((radius) => (
        <option key={radius} value={radius}>
          {radius}px
        </option>
      ))}
    </select>
  </label>
);

const BrushToolbar = ({
  activeTool,
  brushSize,
  canUndo,
  onSelectTool,
  onSelectSize,
  onUndo,
}: BrushToolbarProps) => (
  <div className="brush-toolbar" role="toolbar" aria-label="Edge brush tools">
    <button
      className={`tool-toggle-btn ${activeTool === 'pan' ? 'active' : ''}`}
      title="Pan / Zoom mode"
      type="button"
      onClick={() => onSelectTool('pan')}
    >
      <Move size={14} />
      <span>Pan</span>
    </button>
    <button
      className={`tool-toggle-btn ${activeTool === 'brush' ? 'active' : ''}`}
      title="Shift edge brush"
      type="button"
      onClick={() => onSelectTool('brush')}
    >
      <Paintbrush size={14} />
      <span>Shift Edge</span>
    </button>
    {activeTool === 'brush' && (
      <div className="brush-size-group">
        <BrushRadiusControl brushSize={brushSize} onSelectSize={onSelectSize} />
        <button
          className="undo-btn"
          disabled={!canUndo}
          title="Undo brush stroke"
          type="button"
          onClick={onUndo}
        >
          <Undo2 size={13} />
        </button>
      </div>
    )}
  </div>
);

const BrushCursor = ({
  pos,
  size,
  zoom,
}: {
  pos: { x: number; y: number };
  size: number;
  zoom: number;
}) => {
  const displayRadius = size * zoom;
  return (
    <div
      className="brush-cursor-ring"
      style={{
        left: pos.x,
        top: pos.y,
        width: displayRadius * 2,
        height: displayRadius * 2,
      }}
      aria-hidden="true"
    />
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
      disabled={zoom >= 16}
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
