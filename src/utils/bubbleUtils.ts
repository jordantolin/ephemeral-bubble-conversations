
import * as THREE from 'three';
import { BubbleData } from '@/types/bubble';

// Update the bubble color to be more vibrant
const BUBBLE_COLOR = 0xf7d046;

export const createTextCanvas = (text: string, fontSize: number = 32): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext('2d');

  if (context) {
    context.fillStyle = 'transparent';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.font = `bold ${fontSize}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Thicker outline for better visibility
    context.strokeStyle = '#000000';
    context.lineWidth = 6;
    context.strokeText(text, canvas.width / 2, canvas.height / 2);
    
    context.fillStyle = '#FFFFFF';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
  }

  return canvas;
};

export const createBubbleGeometry = (size: number) => {
  return new THREE.SphereGeometry(size, 32, 32);
};

export const createBubbleMaterial = (isExpired: boolean = false) => {
  return new THREE.MeshPhysicalMaterial({
    color: BUBBLE_COLOR,
    transparent: true,
    opacity: isExpired ? 0.3 : 0.7,
    metalness: 0.2,
    roughness: 0.3,
    transmission: 0.4,
    thickness: 2,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1
  });
};

// Create materials for the container circle
export const createCircleMaterial = () => {
  return new THREE.MeshBasicMaterial({
    color: BUBBLE_COLOR,
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide
  });
};

export const createRingMaterial = () => {
  return new THREE.MeshBasicMaterial({
    color: BUBBLE_COLOR,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide
  });
};

// Add the missing functions
export const createCentralWorldGeometry = (radius: number = 10) => {
  return new THREE.CircleGeometry(radius, 64);
};

export const createCentralWorldMaterial = () => {
  return new THREE.MeshBasicMaterial({
    color: BUBBLE_COLOR,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide
  });
};
