
import * as THREE from 'three';
import { BubbleData } from '@/types/bubble';

const BUBBLE_COLOR = 0xebbd34; // The bright yellow color (#ebbd34)

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

export const createCentralWorldGeometry = () => {
  return new THREE.SphereGeometry(3, 64, 64); // Slightly larger sphere
};

export const createCentralWorldMaterial = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; // Higher resolution
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    // Create ocean background
    ctx.fillStyle = '#0EA5E9';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw continents
    ctx.fillStyle = '#4ADE80';
    
    // Antarctica
    ctx.beginPath();
    ctx.arc(canvas.width/2, canvas.height - 50, 100, 0, Math.PI * 2);
    ctx.fill();

    // North America
    ctx.beginPath();
    ctx.moveTo(200, 100);
    ctx.quadraticCurveTo(300, 150, 350, 200);
    ctx.quadraticCurveTo(250, 250, 200, 100);
    ctx.fill();

    // South America
    ctx.beginPath();
    ctx.moveTo(350, 250);
    ctx.quadraticCurveTo(400, 350, 300, 400);
    ctx.quadraticCurveTo(250, 300, 350, 250);
    ctx.fill();

    // Europe
    ctx.beginPath();
    ctx.moveTo(500, 100);
    ctx.quadraticCurveTo(600, 150, 550, 200);
    ctx.quadraticCurveTo(500, 150, 500, 100);
    ctx.fill();

    // Africa
    ctx.beginPath();
    ctx.moveTo(500, 200);
    ctx.quadraticCurveTo(600, 300, 550, 400);
    ctx.quadraticCurveTo(450, 300, 500, 200);
    ctx.fill();

    // Asia
    ctx.beginPath();
    ctx.moveTo(600, 100);
    ctx.quadraticCurveTo(800, 200, 750, 300);
    ctx.quadraticCurveTo(600, 250, 600, 100);
    ctx.fill();

    // Australia
    ctx.beginPath();
    ctx.arc(800, 350, 70, 0, Math.PI * 2);
    ctx.fill();

    // Add highlights and details
    ctx.fillStyle = '#86EFAC';
    ctx.globalAlpha = 0.3;
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  return new THREE.MeshPhysicalMaterial({
    map: texture,
    bumpMap: texture,
    bumpScale: 0.05,
    transparent: false,
    metalness: 0.1,
    roughness: 0.8,
    clearcoat: 0.3,
    clearcoatRoughness: 0.2
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
    context.fillStyle = 'transparent';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Enhanced text rendering
    context.font = `bold ${fontSize}px Montserrat, Arial`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Strong white outline
    context.strokeStyle = '#FFFFFF';
    context.lineWidth = 8;
    context.strokeText(text, canvas.width / (2 * pixelRatio), canvas.height / (2 * pixelRatio));
    
    // Dark fill for contrast
    context.fillStyle = '#000000';
    context.fillText(text, canvas.width / (2 * pixelRatio), canvas.height / (2 * pixelRatio));
    
    // Add glow effect
    context.shadowColor = 'rgba(255, 255, 255, 0.8)';
    context.shadowBlur = 15;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
    context.fillStyle = '#FFFFFF';
    context.fillText(text, canvas.width / (2 * pixelRatio), canvas.height / (2 * pixelRatio));
  }

  return canvas;
};
