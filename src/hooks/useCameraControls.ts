
import { useRef, useCallback } from 'react';

export const useCameraControls = () => {
  const zoomRef = useRef({
    current: 16,
    target: 16,
    min: 8,
    max: 24
  });

  const panRef = useRef({
    startX: 0,
    startY: 0,
    isDragging: false
  });

  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();
    const zoomSpeed = 0.001;
    zoomRef.current.target = Math.max(
      zoomRef.current.min,
      Math.min(zoomRef.current.max,
        zoomRef.current.target + event.deltaY * zoomSpeed * zoomRef.current.target
      )
    );
  }, []);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    event.preventDefault();
    if (event.touches.length === 1) {
      panRef.current.startX = event.touches[0].clientX;
      panRef.current.startY = event.touches[0].clientY;
      panRef.current.isDragging = true;
    }
  }, []);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    event.preventDefault();
    if (!panRef.current.isDragging) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - panRef.current.startX;
    const deltaY = touch.clientY - panRef.current.startY;

    panRef.current.startX = touch.clientX;
    panRef.current.startY = touch.clientY;

    return { deltaX: deltaX * 0.005, deltaY: deltaY * 0.005 };
  }, []);

  const handleTouchEnd = useCallback(() => {
    panRef.current.isDragging = false;
  }, []);

  return {
    zoomRef,
    panRef,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
};
