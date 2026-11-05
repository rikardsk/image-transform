import { type RefObject, useEffect, useState } from 'react';

export const clampZoom = (value: number): number => {
  return Math.min(5, Math.max(0.5, Number(value.toFixed(2))));
};

export const handleWheelZoom = (
  deltaY: number,
  zoomIn: () => void,
  zoomOut: () => void,
): void => {
  if (deltaY < 0) {
    zoomIn();
    return;
  }

  zoomOut();
};

export const useZoomWheel = (
  containerRef: RefObject<HTMLElement | null>,
  zoomIn: () => void,
  zoomOut: () => void,
  enabled: boolean,
): void => {
  useEffect(() => {
    const element = containerRef.current;
    if (!element || !enabled) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      handleWheelZoom(event.deltaY, zoomIn, zoomOut);
    };

    element.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      element.removeEventListener('wheel', onWheel);
    };
  }, [containerRef, zoomIn, zoomOut, enabled]);
};

export const useZoomPan = (resetTrigger: unknown) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [resetTrigger]);

  const zoomIn = () => setZoom((prev) => clampZoom(prev + 0.25));
  const zoomOut = () => setZoom((prev) => clampZoom(prev - 0.25));
  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const startPan = (clientX: number, clientY: number) => {
    if (zoom <= 1) return;
    setIsPanning(true);
    setOrigin({ x: clientX - pan.x, y: clientY - pan.y });
  };

  const updatePan = (clientX: number, clientY: number) => {
    if (!isPanning || zoom <= 1) return;
    setPan({ x: clientX - origin.x, y: clientY - origin.y });
  };

  return {
    zoom,
    pan,
    isPanning,
    zoomIn,
    zoomOut,
    resetZoom,
    startPan,
    updatePan,
    endPan: () => setIsPanning(false),
  };
};
