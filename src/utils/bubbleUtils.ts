
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
  canvas.width = 2048; // Higher resolution for better detail
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    // Ocean base
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0EA5E9');  // Lighter blue at top
    gradient.addColorStop(1, '#0284C7');  // Darker blue at bottom
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Function to draw continent path
    const drawContinent = (points: [number, number][], color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      points.forEach((point, i) => {
        if (i > 0) {
          ctx.lineTo(point[0], point[1]);
        }
      });
      ctx.closePath();
      ctx.fill();
    };

    // North America
    drawContinent([
      [300, 100], [500, 150], [450, 300],
      [350, 350], [250, 300], [200, 200]
    ], '#4ADE80');

    // South America
    drawContinent([
      [450, 400], [500, 600], [400, 700],
      [350, 650], [350, 450]
    ], '#4ADE80');

    // Europe
    drawContinent([
      [700, 150], [900, 150], [950, 250],
      [850, 300], [750, 250]
    ], '#4ADE80');

    // Africa
    drawContinent([
      [700, 300], [900, 300], [950, 500],
      [850, 600], [700, 550], [650, 400]
    ], '#4ADE80');

    // Asia
    drawContinent([
      [900, 100], [1400, 150], [1500, 300],
      [1400, 400], [1200, 350], [1000, 200]
    ], '#4ADE80');

    // Australia
    drawContinent([
      [1200, 500], [1400, 500], [1450, 600],
      [1350, 700], [1200, 650]
    ], '#4ADE80');

    // Antarctica
    drawContinent([
      [400, 800], [800, 800], [1000, 900],
      [600, 950], [200, 900]
    ], '#4ADE80');

    // Add continent details and highlights
    ctx.fillStyle = '#86EFAC';
    ctx.globalAlpha = 0.3;
    ctx.fill();

    // Add a subtle cloud layer
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = 0.1;
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = 50 + Math.random() * 100;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  return new THREE.MeshPhysicalMaterial({
    map: texture,
    bumpMap: texture,
    bumpScale: 0.1,
    transparent: false,
    metalness: 0.1,
    roughness: 0.8,
    clearcoat: 0.5,
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
