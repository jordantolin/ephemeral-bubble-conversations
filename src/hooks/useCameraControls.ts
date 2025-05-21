
import { useRef } from 'react';
import * as THREE from 'three';

type MouseRef = {
  isDown: boolean;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  rotationSpeed: number;
  damping: number;
  momentumX: number;
  momentumY: number;
  zoom: number;
  zoomSpeed: number;
  minZoom: number;
  maxZoom: number;
  lastPinchDistance: number;
};

export const useCameraControls = () => {
  const mouseRef = useRef<MouseRef>({
    isDown: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    rotationSpeed: 0.5,
    damping: 0.95,
    momentumX: 0,
    momentumY: 0,
    zoom: 15,
    zoomSpeed: 0.1,
    minZoom: 5,
    maxZoom: 30,
    lastPinchDistance: 0
  });

  const handleMouseDown = (e: MouseEvent) => {
    mouseRef.current.isDown = true;
    mouseRef.current.startX = e.clientX;
    mouseRef.current.startY = e.clientY;
    mouseRef.current.lastX = e.clientX;
    mouseRef.current.lastY = e.clientY;
    
    // Reset momentum when starting a new drag
    mouseRef.current.momentumX = 0;
    mouseRef.current.momentumY = 0;
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!mouseRef.current.isDown) return;
    
    // Calculate delta movement
    const deltaX = e.clientX - mouseRef.current.lastX;
    const deltaY = e.clientY - mouseRef.current.lastY;
    
    // Update momentum based on movement
    mouseRef.current.momentumX = deltaX * mouseRef.current.rotationSpeed;
    mouseRef.current.momentumY = deltaY * mouseRef.current.rotationSpeed;
    
    // Update last position
    mouseRef.current.lastX = e.clientX;
    mouseRef.current.lastY = e.clientY;
  };

  const handleMouseUp = () => {
    mouseRef.current.isDown = false;
  };

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    
    // Adjust zoom based on wheel delta
    const zoomDelta = e.deltaY * mouseRef.current.zoomSpeed * 0.01;
    mouseRef.current.zoom += zoomDelta;
    
    // Clamp zoom to min/max range
    mouseRef.current.zoom = Math.max(
      mouseRef.current.minZoom, 
      Math.min(mouseRef.current.maxZoom, mouseRef.current.zoom)
    );
  };

  const handlePinchZoom = (currentDistance: number) => {
    if (mouseRef.current.lastPinchDistance > 0) {
      const pinchDelta = mouseRef.current.lastPinchDistance - currentDistance;
      const zoomDelta = pinchDelta * mouseRef.current.zoomSpeed * 0.01;
      mouseRef.current.zoom += zoomDelta;
      mouseRef.current.zoom = Math.max(
        mouseRef.current.minZoom, 
        Math.min(mouseRef.current.maxZoom, mouseRef.current.zoom)
      );
    }
    mouseRef.current.lastPinchDistance = currentDistance;
  };

  const updateCamera = (camera: THREE.PerspectiveCamera) => {
    // Apply momentum with damping
    if (!mouseRef.current.isDown) {
      mouseRef.current.momentumX *= mouseRef.current.damping;
      mouseRef.current.momentumY *= mouseRef.current.damping;
      
      // Only apply momentum if it's significant
      if (Math.abs(mouseRef.current.momentumX) > 0.01 || Math.abs(mouseRef.current.momentumY) > 0.01) {
        camera.rotateY(mouseRef.current.momentumX * 0.001);
        camera.rotateX(mouseRef.current.momentumY * 0.001);
      }
    }
    
    // Apply zoom
    const zoomTarget = mouseRef.current.zoom;
    const currentDistance = camera.position.length();
    
    if (Math.abs(currentDistance - zoomTarget) > 0.1) {
      const delta = (zoomTarget - currentDistance) * 0.1;
      const direction = camera.position.clone().normalize();
      camera.position.addScaledVector(direction, delta);
    }
    
    // Ensure the camera is always looking at the origin
    camera.lookAt(new THREE.Vector3(0, 0, 0));
  };

  return {
    mouseRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handlePinchZoom,
    updateCamera
  };
};

export default useCameraControls;
