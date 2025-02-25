
import { useRef, useCallback } from 'react';
import * as THREE from 'three';

export const useCameraControls = () => {
  const zoomRef = useRef({
    current: 16,
    target: 16,
    min: 4, // Decreased min zoom to allow closer view
    max: 25, // Increased max zoom to allow further view
    velocity: 0
  });

  const rotationRef = useRef({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    velocity: { x: 0, y: 0 }
  });

  const touchRef = useRef({
    startX: 0,
    startY: 0,
    isDragging: false,
    initialPinchDistance: 0,
    lastPinchDistance: 0,
    initialZoom: 16,
    isMultiTouch: false
  });

  const handleMouseDown = useCallback((event: MouseEvent) => {
    event.preventDefault();
    touchRef.current.isDragging = true;
    touchRef.current.startX = event.clientX;
    touchRef.current.startY = event.clientY;
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!touchRef.current.isDragging) return;

    const deltaX = event.clientX - touchRef.current.startX;
    const deltaY = event.clientY - touchRef.current.startY;

    // Enhanced rotation sensitivity for touch
    const sensitivity = 0.004;
    rotationRef.current.targetY += deltaX * sensitivity;
    rotationRef.current.targetX += deltaY * sensitivity;

    // Limit vertical rotation to prevent flipping
    rotationRef.current.targetX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotationRef.current.targetX));

    touchRef.current.startX = event.clientX;
    touchRef.current.startY = event.clientY;
  }, []);

  const handleMouseUp = useCallback(() => {
    touchRef.current.isDragging = false;
    touchRef.current.isMultiTouch = false;
  }, []);

  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();
    const zoomSpeed = 0.002; // Increased zoom speed slightly
    zoomRef.current.target = Math.max(
      zoomRef.current.min,
      Math.min(zoomRef.current.max,
        zoomRef.current.target + event.deltaY * zoomSpeed * zoomRef.current.target
      )
    );
  }, []);

  // Enhanced pinch zoom handling
  const handlePinchStart = useCallback((distance: number) => {
    touchRef.current.isMultiTouch = true;
    touchRef.current.initialPinchDistance = distance;
    touchRef.current.lastPinchDistance = distance;
    touchRef.current.initialZoom = zoomRef.current.current;
  }, []);

  const handlePinchZoom = useCallback((distance: number) => {
    if (!touchRef.current.isMultiTouch) return;

    const scale = distance / touchRef.current.initialPinchDistance;
    const newZoom = touchRef.current.initialZoom / scale;
    
    // Enhanced zoom smoothing with wider range
    zoomRef.current.target = Math.max(
      zoomRef.current.min,
      Math.min(zoomRef.current.max, newZoom)
    );
    
    touchRef.current.lastPinchDistance = distance;
  }, []);

  const updateCamera = useCallback((camera: THREE.Camera) => {
    // Smoothly update rotation with enhanced inertia
    const rotationDamping = 0.12;
    rotationRef.current.x += (rotationRef.current.targetX - rotationRef.current.x) * rotationDamping;
    rotationRef.current.y += (rotationRef.current.targetY - rotationRef.current.y) * rotationDamping;

    // Apply rotation to camera with smooth interpolation
    camera.position.x = Math.sin(rotationRef.current.y) * zoomRef.current.current;
    camera.position.z = Math.cos(rotationRef.current.y) * zoomRef.current.current;
    camera.position.y = Math.sin(rotationRef.current.x) * zoomRef.current.current;

    // Enhanced zoom smoothing
    const zoomDamping = 0.1;
    zoomRef.current.current += (zoomRef.current.target - zoomRef.current.current) * zoomDamping;

    // Ensure camera always looks at center
    camera.lookAt(new THREE.Vector3(0, 0, 0));
  }, []);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handlePinchStart,
    handlePinchZoom,
    updateCamera,
    zoomRef,
    rotationRef,
    touchRef
  };
};
