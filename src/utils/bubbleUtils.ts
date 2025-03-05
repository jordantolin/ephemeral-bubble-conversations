
import * as THREE from 'three';

// Function to create bubble geometry
export const createBubbleGeometry = (size: number = 1) => {
  return new THREE.SphereGeometry(size, 32, 32);
};

// Function to create bubble material
export const createBubbleMaterial = () => {
  return new THREE.MeshPhysicalMaterial({
    color: '#ebbd34',
    metalness: 0.1,
    roughness: 0.2,
    transmission: 0.9,
    opacity: 0.4,
    transparent: true,
    side: THREE.DoubleSide,
    clearcoat: 1,
    clearcoatRoughness: 0.25
  });
};

// Function to create central world geometry
export const createCentralWorldGeometry = () => {
  return new THREE.IcosahedronGeometry(1, 3);
};

// Function to create central world material
export const createCentralWorldMaterial = () => {
  return new THREE.MeshStandardMaterial({
    color: '#a38025',
    emissive: '#a38025',
    emissiveIntensity: 0.1,
    roughness: 0.4,
    metalness: 0.1
  });
};

// Update the createTextCanvas function to ensure dark text for better readability
export const createTextCanvas = (text: string, fontSize: number = 32, textColor: string = '#000000') => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  
  // Set canvas dimensions
  canvas.width = 512;
  canvas.height = 128;
  
  // Clear canvas with transparent background
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Set text properties for better readability
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Add stronger text shadow for better readability
  ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  
  // Draw text with dark color (near black) for maximum readability
  ctx.fillStyle = textColor;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  
  return canvas;
};

// Add these dummy exports to fix the build errors
export const createRateLimiter = () => ({
  checkLimit: () => true
});

export const createRetryHandler = () => ({
  retry: async (fn: Function) => await fn()
});

export const connectionManager = {
  isConnected: true,
  connect: () => {},
  disconnect: () => {}
};
