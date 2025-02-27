
import * as THREE from 'three';
import { BubbleData } from '@/types/bubble';

const BUBBLE_COLOR = 0xFFD700; // Bright yellow color

export const createBubbleGeometry = (size: number) => {
  return new THREE.SphereGeometry(size, 32, 32);
};

export const createBubbleMaterial = () => {
  return new THREE.MeshPhysicalMaterial({
    color: BUBBLE_COLOR,
    transparent: true,
    opacity: 0.8, // Slightly more transparent to better see text inside
    metalness: 0.3, // Increased metalness for more shine
    roughness: 0.1, // Reduced roughness for more shine
    transmission: 0.2, // Increased transmission for better text visibility
    thickness: 0.8, // Adjusted thickness
    clearcoat: 1.0,
    clearcoatRoughness: 0.1
  });
};

export const createCentralWorldGeometry = () => {
  return new THREE.SphereGeometry(3, 64, 64);
};

export const createCentralWorldMaterial = () => {
  // Create a smooth grey material instead of the Earth texture
  return new THREE.MeshPhysicalMaterial({
    color: 0x8E9196, // Neutral grey color
    metalness: 0.2,
    roughness: 0.3,
    clearcoat: 0.5,
    clearcoatRoughness: 0.2,
    reflectivity: 0.5,
    envMapIntensity: 0.8
  });
};

export const createTextCanvas = (text: string, fontSize: number = 48): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const pixelRatio = Math.min(window.devicePixelRatio, 2);
  canvas.width = 512 * pixelRatio;
  canvas.height = 256 * pixelRatio;
  const context = canvas.getContext('2d');

  if (context) {
    context.scale(pixelRatio, pixelRatio);
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Enhanced text rendering for in-bubble visibility
    context.font = `bold ${fontSize}px Montserrat, Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // White glow/outline for better contrast inside bubble
    context.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    context.lineWidth = 5;
    context.strokeText(text, canvas.width / (2 * pixelRatio), canvas.height / (2 * pixelRatio));
    
    // Deep black fill for maximum readability
    context.fillStyle = '#000000';
    context.fillText(text, canvas.width / (2 * pixelRatio), canvas.height / (2 * pixelRatio));
  }

  return canvas;
};

export const calculateOrbitPosition = (index: number, totalBubbles: number, time: number) => {
  const angle = (index / totalBubbles) * Math.PI * 2 + time;
  const orbitRadius = 6 + Math.sin(time * 0.5 + index) * 0.5; // Varying radius for more natural look
  const heightOffset = Math.sin(angle * 2) * 0.5; // Vertical oscillation

  return {
    x: Math.cos(angle) * orbitRadius,
    y: Math.sin(angle) * orbitRadius * 0.6 + heightOffset,
    z: Math.sin(angle * 2) * (orbitRadius * 0.3)
  };
};
