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
  canvas.width = 4096; // Increased resolution for better detail
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    // Ocean base with gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0EA5E9');
    gradient.addColorStop(1, '#0369A1');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Detailed continent paths
    const continents = {
      northAmerica: [
        [800, 200], [1000, 180], [1200, 250], [1300, 400],
        [1200, 500], [1000, 450], [900, 480], [800, 400],
        [750, 350], [780, 250]
      ],
      southAmerica: [
        [1100, 600], [1200, 700], [1150, 900], [1000, 1000],
        [900, 950], [850, 800], [900, 700], [1000, 650]
      ],
      europe: [
        [2000, 250], [2200, 200], [2400, 250], [2300, 400],
        [2100, 450], [1900, 400], [1950, 300]
      ],
      africa: [
        [2000, 500], [2200, 450], [2400, 500], [2450, 700],
        [2300, 900], [2100, 950], [1900, 800], [1850, 600]
      ],
      asia: [
        [2300, 200], [2800, 250], [3000, 400], [2900, 600],
        [2700, 700], [2500, 650], [2400, 500], [2300, 400]
      ],
      australia: [
        [3000, 700], [3200, 750], [3300, 850], [3200, 950],
        [3000, 900], [2900, 800]
      ],
      antarctica: [
        [1500, 1700], [2000, 1750], [2500, 1800], [3000, 1750],
        [2800, 1900], [2000, 1950], [1200, 1850]
      ]
    };

    // Function to draw detailed continent
    const drawContinent = (points: number[][], color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      
      // Use curves for smoother coastlines
      for (let i = 1; i < points.length; i++) {
        const xc = (points[i][0] + points[i-1][0]) / 2;
        const yc = (points[i][1] + points[i-1][1]) / 2;
        ctx.quadraticCurveTo(points[i-1][0], points[i-1][1], xc, yc);
      }
      
      ctx.closePath();
      ctx.fill();

      // Add terrain detail
      ctx.save();
      ctx.clip();
      ctx.globalAlpha = 0.1;
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#34D399' : '#6EE7B7';
        for (let j = 0; j < 20; j++) {
          const x = points[0][0] + Math.random() * 200 - 100;
          const y = points[0][1] + Math.random() * 200 - 100;
          ctx.beginPath();
          ctx.arc(x, y, 20 + Math.random() * 40, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    };

    // Draw all continents with enhanced detail
    Object.values(continents).forEach(points => {
      drawContinent(points, '#4ADE80');
    });

    // Add ice caps
    ctx.fillStyle = '#F0FDFA';
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(canvas.width/2, 100, 400, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(canvas.width/2, canvas.height - 100, 400, 0, Math.PI * 2);
    ctx.fill();

    // Add cloud layer
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = 100 + Math.random() * 200;
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
    bumpScale: 0.15,
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
