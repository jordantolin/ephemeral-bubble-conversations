
import * as THREE from 'three';
import { BubbleData } from '@/types/bubble';

const BUBBLE_COLOR = 0xf7d046; // Bright yellow color
const WORLD_COLOR = 0xffffff; // White color for the central sphere

export const createBubbleGeometry = (size: number) => {
  return new THREE.SphereGeometry(size, 32, 32);
};

export const createBubbleMaterial = () => {
  return new THREE.MeshPhysicalMaterial({
    color: BUBBLE_COLOR,
    transparent: true,
    opacity: 0.7,
    metalness: 0.1,
    roughness: 0.2,
    transmission: 0.3,
    thickness: 0.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1
  });
};

// Add container circle creation functions
export const createContainerCircleGeometry = (radius: number) => {
  return new THREE.CircleGeometry(radius, 64);
};

export const createContainerCircleMaterial = () => {
  return new THREE.MeshBasicMaterial({
    color: BUBBLE_COLOR,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide
  });
};

export const createContainerRingGeometry = (radius: number) => {
  return new THREE.RingGeometry(radius - 0.1, radius, 64);
};

export const createContainerRingMaterial = () => {
  return new THREE.MeshBasicMaterial({
    color: BUBBLE_COLOR,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide
  });
};

export const createTextCanvas = (text: string, fontSize: number = 48): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');

  if (context) {
    context.fillStyle = 'transparent';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.font = `bold ${fontSize}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    context.strokeStyle = '#000000';
    context.lineWidth = 12;
    context.strokeText(text, canvas.width / 2, canvas.height / 2);
    
    context.fillStyle = '#FFFFFF';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    context.shadowColor = 'rgba(0, 0, 0, 0.9)';
    context.shadowBlur = 20;
    context.shadowOffsetX = 4;
    context.shadowOffsetY = 4;
    context.fillText(text, canvas.width / 2, canvas.height / 2);
  }

  return canvas;
};
