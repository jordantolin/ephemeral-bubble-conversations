
import { useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';

export const useCameraControls = () => {
  const zoomRef = useRef({
    current: 16,
    target: 16,
    min: 3, // Closer minimum zoom for better Earth visibility
    max: 30
  });

  const rotationRef = useRef({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    velocityX: 0,
    velocityY: 0,
    inertia: 0.95 // Inertia coefficient (0-1)
  });

  const mouseRef = useRef({
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    isDragging: false,
    lastPinchDistance: 0,
    moveThreshold: 5, // Threshold to determine if it's a drag or tap
    lastTime: 0 // For calculating velocity
  });

  const handleMouseDown = useCallback((event: MouseEvent) => {
    mouseRef.current.isDragging = true;
    mouseRef.current.startX = event.clientX;
    mouseRef.current.startY = event.clientY;
    mouseRef.current.lastX = event.clientX;
    mouseRef.current.lastY = event.clientY;
    mouseRef.current.lastTime = performance.now();
    
    // Reset velocity when starting a new drag
    rotationRef.current.velocityX = 0;
    rotationRef.current.velocityY = 0;
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!mouseRef.current.isDragging) return;
    
    const now = performance.now();
    const deltaTime = now - mouseRef.current.lastTime;
    
    if (deltaTime === 0) return;
    
    const deltaX = event.clientX - mouseRef.current.lastX;
    const deltaY = event.clientY - mouseRef.current.lastY;
    
    // Calculate instantaneous velocity
    rotationRef.current.velocityX = deltaX / deltaTime * 16; // Scaled for 60fps
    rotationRef.current.velocityY = deltaY / deltaTime * 16;
    
    // Update rotation targets
    rotationRef.current.targetY += deltaX * 0.004;
    rotationRef.current.targetX += deltaY * 0.004;
    
    // Limit vertical rotation
    rotationRef.current.targetX = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, rotationRef.current.targetX));
    
    // Store current position and time for next calculation
    mouseRef.current.lastX = event.clientX;
    mouseRef.current.lastY = event.clientY;
    mouseRef.current.lastTime = now;
  }, []);

  const handleMouseUp = useCallback(() => {
    mouseRef.current.isDragging = false;
  }, []);

  const handleDoubleClick = useCallback(() => {
    // Reset to default view
    rotationRef.current.targetX = 0;
    rotationRef.current.targetY = 0;
    zoomRef.current.target = 16;
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

    // Apply inertia when not dragging
    if (!mouseRef.current.isDragging) {
      rotationRef.current.velocityX *= rotationRef.current.inertia;
      rotationRef.current.velocityY *= rotationRef.current.inertia;
      
      if (Math.abs(rotationRef.current.velocityX) > 0.01 || Math.abs(rotationRef.current.velocityY) > 0.01) {
        rotationRef.current.targetY += rotationRef.current.velocityX * 0.004;
        rotationRef.current.targetX += rotationRef.current.velocityY * 0.004;
        
        // Limit vertical rotation
        rotationRef.current.targetX = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, rotationRef.current.targetX));
      }
    }

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
    handleDoubleClick,
    handleWheel,
    handlePinchZoom,
    updateCamera,
    zoomRef,
    rotationRef,
    mouseRef
  };
};
