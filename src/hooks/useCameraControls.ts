
import { useRef, useCallback } from 'react';
import * as THREE from 'three';

export const useCameraControls = () => {
  const zoomRef = useRef({
    current: 16,
    target: 16,
    min: 4, // Reduced min zoom to get closer
    max: 30  // Increased max zoom to get further
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

    // Regular rotation for mouse movement
    rotationRef.current.targetY += deltaX * 0.005;
    rotationRef.current.targetX += deltaY * 0.005;

    // Limit vertical rotation for better experience
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

  // Updated pinch zoom handler with corrected direction
  const handlePinchZoom = useCallback((distance: number) => {
    const pinchDelta = distance - mouseRef.current.lastPinchDistance;
    const zoomSpeed = 0.02;
    
    // Inverted the direction by changing the sign
    zoomRef.current.target = Math.max(
      zoomRef.current.min,
      Math.min(zoomRef.current.max,
        zoomRef.current.target - pinchDelta * zoomSpeed
      )
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

    // Smooth zoom with increased damping for mobile
    zoomRef.current.current += (zoomRef.current.target - zoomRef.current.current) * 0.15;

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
