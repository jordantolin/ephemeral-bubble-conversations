
import { useRef, useCallback } from 'react';
import * as THREE from 'three';

export const useCameraControls = () => {
  const zoomRef = useRef({
    current: 16,
    target: 16,
    min: 8,
    max: 24
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
    isDragging: false
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

    // Limit vertical rotation
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

  const updateCamera = useCallback((camera: THREE.Camera) => {
    // Smoothly update rotation
    rotationRef.current.x += (rotationRef.current.targetX - rotationRef.current.x) * 0.1;
    rotationRef.current.y += (rotationRef.current.targetY - rotationRef.current.y) * 0.1;

    // Apply rotation to camera
    camera.position.x = Math.sin(rotationRef.current.y) * zoomRef.current.current;
    camera.position.z = Math.cos(rotationRef.current.y) * zoomRef.current.current;
    camera.position.y = Math.sin(rotationRef.current.x) * zoomRef.current.current;

    // Update zoom
    zoomRef.current.current += (zoomRef.current.target - zoomRef.current.current) * 0.1;

    // Make camera look at center
    camera.lookAt(new THREE.Vector3(0, 0, 0));
  }, []);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    updateCamera,
    zoomRef,
    rotationRef
  };
};
