
import { useRef, useCallback } from 'react';
import * as THREE from 'three';

export const useCameraControls = () => {
  const zoomRef = useRef({
    current: 16,
    target: 16,
    min: 4, // Increased minimum zoom for better mobile visibility
    max: 30
  });

  const rotationRef = useRef({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0
  });

  const mouseRef = useRef({
    startX: 0,
    startY: 0,
    isDragging: false,
    lastPinchDistance: 0,
    moveThreshold: 5 // Threshold to determine if it's a drag or tap
  });

  const handleMouseDown = useCallback((event: MouseEvent) => {
    mouseRef.current.isDragging = false;
    mouseRef.current.startX = event.clientX;
    mouseRef.current.startY = event.clientY;
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    const deltaX = event.clientX - mouseRef.current.startX;
    const deltaY = event.clientY - mouseRef.current.startY;

    // Check if movement exceeds threshold
    if (Math.abs(deltaX) > mouseRef.current.moveThreshold || 
        Math.abs(deltaY) > mouseRef.current.moveThreshold) {
      mouseRef.current.isDragging = true;
    }

    rotationRef.current.targetY += deltaX * 0.004;
    rotationRef.current.targetX += deltaY * 0.004;

    // Limit vertical rotation
    rotationRef.current.targetX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotationRef.current.targetX));

    mouseRef.current.startX = event.clientX;
    mouseRef.current.startY = event.clientY;
  }, []);

  // Fixed to be consistent: takes no parameters and returns a boolean
  const handleMouseUp = useCallback(() => {
    // Keep track of dragging state
    const wasDragging = mouseRef.current.isDragging;
    mouseRef.current.isDragging = false;
    return wasDragging;
  }, []);

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

  const handlePinchZoom = useCallback((distance: number) => {
    if (mouseRef.current.lastPinchDistance === 0) {
      mouseRef.current.lastPinchDistance = distance;
      return;
    }

    const pinchDelta = distance - mouseRef.current.lastPinchDistance;
    const zoomSpeed = 0.03; // Adjusted for smoother mobile zoom
    const zoomDelta = pinchDelta * zoomSpeed;
    const currentZoom = zoomRef.current.target;
    const newZoom = currentZoom - zoomDelta;

    zoomRef.current.target = Math.max(
      zoomRef.current.min,
      Math.min(zoomRef.current.max, newZoom)
    );
    
    mouseRef.current.lastPinchDistance = distance;
  }, []);

  const updateCamera = useCallback((camera: THREE.Camera) => {
    if (!camera) return;

    // Smoother rotation transitions
    rotationRef.current.x += (rotationRef.current.targetX - rotationRef.current.x) * 0.1;
    rotationRef.current.y += (rotationRef.current.targetY - rotationRef.current.y) * 0.1;

    const radius = zoomRef.current.current;

    // Update camera position with smooth transitions
    camera.position.x = Math.sin(rotationRef.current.y) * Math.cos(rotationRef.current.x) * radius;
    camera.position.z = Math.cos(rotationRef.current.y) * Math.cos(rotationRef.current.x) * radius;
    camera.position.y = Math.sin(rotationRef.current.x) * radius;

    // Smooth zoom transition
    zoomRef.current.current += (zoomRef.current.target - zoomRef.current.current) * 0.1;

    camera.lookAt(new THREE.Vector3(0, 0, 0));
  }, []);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handlePinchZoom,
    updateCamera,
    zoomRef,
    rotationRef,
    mouseRef
  };
};
