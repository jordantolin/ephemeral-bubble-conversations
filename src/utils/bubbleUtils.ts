
import * as THREE from 'three';
import { BubbleData } from '@/types/bubble';

const BUBBLE_COLOR = 0xebbd34;

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
  return new THREE.SphereGeometry(3, 64, 64);
};

export const createCentralWorldMaterial = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 4096;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    // Ocean base - soft blue
    ctx.fillStyle = '#E0F2FE';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Function to draw continent with real coordinates
    const drawContinent = (path: number[][], fillColor: string) => {
      ctx.beginPath();
      path.forEach((point, index) => {
        const [x, y] = point;
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          // Use curves for natural coastlines
          const prevPoint = path[index - 1];
          const cpX = (prevPoint[0] + x) / 2;
          const cpY = (prevPoint[1] + y) / 2;
          ctx.quadraticCurveTo(prevPoint[0], prevPoint[1], cpX, cpY);
        }
      });
      ctx.closePath();
      
      // Fill with subtle gradient
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, fillColor);
      gradient.addColorStop(1, fillColor.replace(')', ', 0.9)'));
      ctx.fillStyle = gradient;
      ctx.fill();
    };

    // Real continent coordinates (normalized to canvas size)
    const continents = {
      northAmerica: [
        [820, 280], [920, 200], [1100, 180], [1300, 220],
        [1400, 380], [1300, 480], [1100, 520], [900, 500],
        [800, 450], [750, 380], [780, 300]
      ],
      southAmerica: [
        [1050, 600], [1150, 650], [1200, 800], [1150, 950],
        [1050, 1050], [950, 1000], [900, 850], [950, 700]
      ],
      europe: [
        [1900, 250], [2100, 200], [2300, 220], [2400, 300],
        [2300, 400], [2100, 380], [1950, 350]
      ],
      africa: [
        [1950, 450], [2150, 420], [2350, 450], [2400, 600],
        [2300, 800], [2150, 850], [1950, 750], [1900, 600]
      ],
      asia: [
        [2350, 200], [2800, 150], [3200, 250], [3300, 400],
        [3200, 550], [2900, 600], [2600, 550], [2400, 400]
      ],
      australia: [
        [3000, 700], [3200, 750], [3300, 850], [3200, 950],
        [3000, 900], [2900, 800]
      ],
      antarctica: [
        [1500, 1600], [2000, 1650], [2500, 1700], [3000, 1650],
        [2800, 1800], [2000, 1850], [1200, 1750]
      ]
    };

    // Draw each continent with minimal style
    Object.entries(continents).forEach(([name, path]) => {
      drawContinent(path, 'rgba(148, 163, 184, 0.8)'); // Slate-400 with transparency
    });

    // Add subtle grid lines
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
    ctx.lineWidth = 1;

    // Draw latitude lines
    for (let y = 0; y < canvas.height; y += canvas.height / 18) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw longitude lines
    for (let x = 0; x < canvas.width; x += canvas.width / 36) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // Add subtle poles
    const polarGradient = ctx.createRadialGradient(
      canvas.width/2, 50, 0,
      canvas.width/2, 50, 400
    );
    polarGradient.addColorStop(0, 'rgba(241, 245, 249, 0.4)');
    polarGradient.addColorStop(1, 'rgba(241, 245, 249, 0)');
    
    ctx.fillStyle = polarGradient;
    ctx.fillRect(0, 0, canvas.width, 200);
    
    const southPolarGradient = ctx.createRadialGradient(
      canvas.width/2, canvas.height - 50, 0,
      canvas.width/2, canvas.height - 50, 400
    );
    southPolarGradient.addColorStop(0, 'rgba(241, 245, 249, 0.4)');
    southPolarGradient.addColorStop(1, 'rgba(241, 245, 249, 0)');
    
    ctx.fillStyle = southPolarGradient;
    ctx.fillRect(0, canvas.height - 200, canvas.width, 200);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  return new THREE.MeshPhysicalMaterial({
    map: texture,
    bumpMap: texture,
    bumpScale: 0.05,
    transparent: false,
    metalness: 0.2,
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
