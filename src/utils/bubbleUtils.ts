
import * as THREE from 'three';
import { BubbleData } from '@/types/bubble';

const BUBBLE_COLOR = 0xebbd34; // The bright yellow color (#ebbd34)
const WORLD_COLOR = 0xffffff; // White color for the central sphere

export const createBubbleGeometry = (size: number) => {
  return new THREE.SphereGeometry(size, 32, 32);
};

export const createBubbleMaterial = () => {
  return new THREE.MeshPhysicalMaterial({
    color: BUBBLE_COLOR,
    transparent: true,
    opacity: 0.7,
    metalness: 0.1, // Reduced metalness to show more of the true color
    roughness: 0.2,
    transmission: 0.3, // Reduced transmission to make color more visible
    thickness: 0.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1
  });
};

export const createCentralWorldGeometry = () => {
  return new THREE.SphereGeometry(2, 64, 64);
};

export const createCentralWorldMaterial = () => {
  return new THREE.MeshPhysicalMaterial({
    color: WORLD_COLOR,
    transparent: true,
    opacity: 0.9,
    metalness: 0.2,
    roughness: 0.3,
    transmission: 0.6,
    thickness: 0.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1
  });
};

export const createTextCanvas = (text: string, fontSize: number = 64): THREE.Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');

  if (context) {
    context.fillStyle = 'transparent';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.font = `bold ${fontSize}px Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Extra thick black outline for maximum contrast
    context.strokeStyle = '#000000';
    context.lineWidth = 8;
    context.strokeText(text, canvas.width / 2, canvas.height / 2);
    
    // Bright white text
    context.fillStyle = '#FFFFFF';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // Add extra glow/shadow for depth
    context.shadowColor = 'rgba(0, 0, 0, 0.8)';
    context.shadowBlur = 15;
    context.shadowOffsetX = 4;
    context.shadowOffsetY = 4;
    context.fillText(text, canvas.width / 2, canvas.height / 2);
  }

  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  return texture;
};
