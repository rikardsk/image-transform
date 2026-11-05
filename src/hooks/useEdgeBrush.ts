import { useEffect, useRef, useState } from 'react';
import type { TransformResult } from '../types';
import {
  applyShiftEdgeAtPoint,
  createWorkingCanvas,
  exportCanvasToBlob,
} from '../utils/shiftEdgeBrush';
import type { Rgba } from '../utils/imageTransforms';

const whiteBg: Rgba = { red: 255, green: 255, blue: 255, alpha: 255 };

export const getPixelCoords = (
  clientX: number,
  clientY: number,
  element: HTMLElement,
  naturalWidth: number,
  naturalHeight: number,
): { x: number; y: number } | null => {
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  const x = Math.floor(((clientX - rect.left) / rect.width) * naturalWidth);
  const y = Math.floor(((clientY - rect.top) / rect.height) * naturalHeight);
  if (x < 0 || x >= naturalWidth || y < 0 || y >= naturalHeight) return null;
  return { x, y };
};

const initCanvasFromResult = (
  result: TransformResult | null,
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>,
  undoStackRef: React.MutableRefObject<ImageData[]>,
  setCanUndo: (can: boolean) => void,
): void => {
  if (!result) {
    canvasRef.current = null;
    undoStackRef.current = [];
    setCanUndo(false);
    return;
  }
  const img = new Image();
  img.src = result.url;
  img.onload = () => {
    const { canvas } = createWorkingCanvas(img);
    canvasRef.current = canvas;
  };
};

const pushUndoState = (
  canvas: HTMLCanvasElement,
  undoStackRef: React.MutableRefObject<ImageData[]>,
  setCanUndo: (can: boolean) => void,
): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
  undoStackRef.current.push(snapshot);
  if (undoStackRef.current.length > 8) undoStackRef.current.shift();
  setCanUndo(true);
};

const paintAt = (canvas: HTMLCanvasElement, x: number, y: number, radius: number): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const changed = applyShiftEdgeAtPoint(imgData.data, canvas.width, canvas.height, x, y, radius, whiteBg);
  if (changed) {
    ctx.putImageData(imgData, 0, 0);
  }
};

export const useEdgeBrush = (
  result: TransformResult | null,
  onResultUpdate?: (result: TransformResult) => void,
) => {
  const [activeTool, setActiveTool] = useState<'pan' | 'brush'>('pan');
  const [brushSize, setBrushSize] = useState(20);
  const [canUndo, setCanUndo] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const undoStackRef = useRef<ImageData[]>([]);
  const isPaintingRef = useRef(false);

  useEffect(() => {
    initCanvasFromResult(result, canvasRef, undoStackRef, setCanUndo);
  }, [result?.url]);

  const startStroke = (x: number, y: number) => {
    if (activeTool !== 'brush' || !canvasRef.current) return;
    pushUndoState(canvasRef.current, undoStackRef, setCanUndo);
    isPaintingRef.current = true;
    paintAt(canvasRef.current, x, y, brushSize);
  };

  const moveStroke = (x: number, y: number) => {
    if (!isPaintingRef.current || !canvasRef.current) return;
    paintAt(canvasRef.current, x, y, brushSize);
  };

  const endStroke = async () => {
    if (!isPaintingRef.current || !canvasRef.current || !result || !onResultUpdate) return;
    isPaintingRef.current = false;
    const blob = await exportCanvasToBlob(canvasRef.current);
    const url = URL.createObjectURL(blob);
    onResultUpdate({ ...result, blob, url });
  };

  const undo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || undoStackRef.current.length === 0 || !result || !onResultUpdate) return;
    const prev = undoStackRef.current.pop();
    setCanUndo(undoStackRef.current.length > 0);
    if (!prev) return;
    const ctx = canvas.getContext('2d');
    ctx?.putImageData(prev, 0, 0);
    const blob = await exportCanvasToBlob(canvas);
    onResultUpdate({ ...result, blob, url: URL.createObjectURL(blob) });
  };

  return {
    activeTool,
    setActiveTool,
    brushSize,
    setBrushSize,
    canUndo,
    cursorPos,
    setCursorPos,
    startStroke,
    moveStroke,
    endStroke,
    undo,
  };
};
