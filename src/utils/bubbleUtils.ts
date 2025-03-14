
import * as THREE from 'three';

/**
 * Creates a bubble geometry based on size
 * @param size Size of the bubble (radius)
 * @returns THREE geometry for the bubble
 */
export const createBubbleGeometry = (size: number): THREE.BufferGeometry => {
  // Use higher segment count for better-looking bubbles
  return new THREE.SphereGeometry(size, 32, 32);
};

/**
 * Creates a bubble material with proper transparency and reflectivity
 * @param color Color of the bubble
 * @returns THREE material for the bubble
 */
export const createBubbleMaterial = (color: THREE.ColorRepresentation = 0xebbd34): THREE.Material => {
  return new THREE.MeshPhysicalMaterial({
    color: color,
    emissive: 0x664400,
    emissiveIntensity: 0.3,
    metalness: 0.1,
    roughness: 0.1,
    transmission: 0.5,
    reflectivity: 0.7,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
};

/**
 * Creates a canvas with centered text for bubble labels
 * @param text Text to display on the bubble
 * @param fontSize Size of the font
 * @returns Canvas element with rendered text
 */
export const createTextCanvas = (text: string, fontSize: number = 40): HTMLCanvasElement => {
  // Create canvas
  const canvas = document.createElement('canvas');
  const size = Math.max(256, fontSize * 3.5); // Adjust canvas size based on font size
  canvas.width = size;
  canvas.height = size / 2;
  
  // Get context
  const context = canvas.getContext('2d');
  if (!context) {
    console.error('Could not get canvas context');
    return canvas;
  }
  
  // Clear canvas
  context.clearRect(0, 0, canvas.width, canvas.height);
  
  // Configure text style
  context.font = `bold ${fontSize}px Arial, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  
  // Add light background for better readability
  context.fillStyle = 'rgba(255, 255, 255, 0.3)';
  const textWidth = context.measureText(text).width;
  const backgroundWidth = textWidth + fontSize * 0.5;
  const backgroundHeight = fontSize * 1.2;
  const backgroundX = (canvas.width - backgroundWidth) / 2;
  const backgroundY = (canvas.height - backgroundHeight) / 2;
  context.beginPath();
  context.roundRect(backgroundX, backgroundY, backgroundWidth, backgroundHeight, 10);
  context.fill();
  
  // Add shadow for readability
  context.fillStyle = 'rgba(0, 0, 0, 0.7)';
  context.fillText(text, canvas.width / 2 + 2, canvas.height / 2 + 2);
  
  // Draw text
  context.fillStyle = 'white';
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  
  return canvas;
};

/**
 * Calculates dynamic bubble size based on number of bubbles and size category
 * @param totalBubbles Total number of bubbles in the scene
 * @param sizeCategory Size category (sm, md, lg)
 * @returns Calculated size for the bubble
 */
export const calculateDynamicBubbleSize = (totalBubbles: number, sizeCategory: "sm" | "md" | "lg"): number => {
  // Base sizes
  const baseSizes = {
    sm: 0.7,
    md: 1.0,
    lg: 1.3
  };
  
  // Size adjustment based on total bubbles count
  let sizeMultiplier = 1.0;
  
  if (totalBubbles <= 5) {
    // Few bubbles - make them larger
    sizeMultiplier = 1.4;
  } else if (totalBubbles <= 15) {
    // Medium number of bubbles
    sizeMultiplier = 1.2;
  } else if (totalBubbles <= 30) {
    // Many bubbles
    sizeMultiplier = 1.0;
  } else {
    // Lots of bubbles - make them smaller
    sizeMultiplier = 0.8;
  }
  
  return baseSizes[sizeCategory] * sizeMultiplier;
};
