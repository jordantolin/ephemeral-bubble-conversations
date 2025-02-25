
import { useRef, useCallback } from 'react';
import * as THREE from 'three';

export const useCameraControls = () => {
  const zoomRef = useRef({
    current: 16,
    target: 16,
    min: 2, // Even closer min zoom for better mobile experience
    max: 40  // Increased max zoom for more range
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
    lastPinchDistance: 0
  });

  const handleMouseDown = useCallback((event: MouseEvent) => {
    event.preventDefault();
    mouseRef.current.isDragging = true;
    mouseRef.current.startX = event.clientX;
    mouseRef.current.startY = event.clientY;
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!mouseRef.current.isDragging) return;

    const deltaX = event.clientX - mouseRef.current.startX;
    const deltaY = event.clientY - mouseRef.current.startY;

    rotationRef.current.targetY += deltaX * 0.005;
    rotationRef.current.targetX += deltaY * 0.005;

    rotationRef.current.targetX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotationRef.current.targetX));

    mouseRef.current.startX = event.clientX;
    mouseRef.current.startY = event.clientY;
  }, []);

  const handleMouseUp = useCallback(() => {
    mouseRef.current.isDragging = false;
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
    const zoomSpeed = 0.05; // Increased zoom speed for mobile
    
    // Calculate new target zoom based on pinch gesture
    const zoomDelta = pinchDelta * zoomSpeed;
    const currentZoom = zoomRef.current.target;
    const newZoom = currentZoom - zoomDelta;

    // Apply zoom with limits
    zoomRef.current.target = Math.max(
      zoomRef.current.min,
      Math.min(zoomRef.current.max, newZoom)
    );
    
    mouseRef.current.lastPinchDistance = distance;
  }, []);

  const updateCamera = useCallback((camera: THREE.Camera) => {
    // Smoothly update rotation
    rotationRef.current.x += (rotationRef.current.targetX - rotationRef.current.x) * 0.15;
    rotationRef.current.y += (rotationRef.current.targetY - rotationRef.current.y) * 0.15;

    // Apply rotation to camera
    camera.position.x = Math.sin(rotationRef.current.y) * zoomRef.current.current;
    camera.position.z = Math.cos(rotationRef.current.y) * zoomRef.current.current;
    camera.position.y = Math.sin(rotationRef.current.x) * zoomRef.current.current;

    // Smoother zoom transition for mobile
    zoomRef.current.current += (zoomRef.current.target - zoomRef.current.current) * 0.1;

    // Make camera look at center
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
    rotationRef
  };
};
