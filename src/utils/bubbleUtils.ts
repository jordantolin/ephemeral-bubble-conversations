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
    // Vibrant ocean base
    const oceanGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    oceanGradient.addColorStop(0, '#60A5FA');
    oceanGradient.addColorStop(1, '#3B82F6');
    ctx.fillStyle = oceanGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Function to draw cartoon-style continent
    const drawContinent = (path: number[][], color: string) => {
      ctx.beginPath();
      path.forEach((point, index) => {
        const [x, y] = point;
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevPoint = path[index - 1];
          const cpX = (prevPoint[0] + x) / 2;
          const cpY = (prevPoint[1] + y) / 2;
          ctx.quadraticCurveTo(prevPoint[0], prevPoint[1], cpX, cpY);
        }
      });
      ctx.closePath();

      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 5;
      ctx.shadowOffsetY = 5;

      ctx.fillStyle = color;
      ctx.fill();

      ctx.shadowColor = 'transparent';
      const highlight = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      highlight.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
      highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = highlight;
      ctx.fill();
    };

    // More accurate continent shapes
    const continents = {
      northAmerica: [
        [700, 250], [800, 150], [1000, 100], [1200, 150],
        [1400, 200], [1500, 300], [1400, 400], [1300, 450],
        [1100, 500], [900, 450], [800, 400], [700, 350],
        [600, 300], [650, 250]
      ],
      greenland: [
        [1500, 100], [1700, 150], [1600, 200], [1500, 180]
      ],
      southAmerica: [
        [1000, 600], [1100, 650], [1200, 700], [1250, 800],
        [1200, 900], [1150, 1000], [1050, 1100], [950, 1050],
        [900, 950], [850, 800], [900, 700], [950, 600]
      ],
      europe: [
        [1900, 200], [2000, 150], [2200, 150], [2300, 200],
        [2400, 250], [2350, 300], [2200, 350], [2100, 400],
        [1950, 350], [1900, 300]
      ],
      africa: [
        [1900, 450], [2100, 400], [2300, 400], [2400, 500],
        [2450, 600], [2400, 700], [2300, 800], [2200, 900],
        [2000, 950], [1900, 900], [1850, 800], [1800, 600],
        [1850, 500]
      ],
      asia: [
        [2300, 150], [2500, 100], [2800, 150], [3000, 200],
        [3200, 300], [3300, 400], [3200, 500], [3000, 600],
        [2800, 650], [2600, 600], [2400, 500], [2300, 400],
        [2400, 300]
      ],
      indonesia: [
        [2800, 700], [3000, 650], [3200, 700], [3000, 750],
        [2900, 800], [2800, 750]
      ],
      australia: [
        [3000, 800], [3200, 850], [3300, 900], [3200, 1000],
        [3000, 1050], [2900, 1000], [2850, 900], [2900, 850]
      ],
      madagascar: [
        [2450, 800], [2500, 850], [2450, 900], [2400, 850]
      ],
      antarctica: [
        [1000, 1700], [1500, 1750], [2000, 1800], [2500, 1800],
        [3000, 1750], [3200, 1700], [2800, 1600], [2000, 1550],
        [1500, 1600], [1200, 1650]
      ]
    };

    // Draw each continent
    Object.entries(continents).forEach(([name, path]) => {
      drawContinent(path, '#4ADE80');
    });

    // Ice caps
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 5;

    // North pole
    ctx.fillStyle = '#F1F5F9';
    ctx.beginPath();
    ctx.ellipse(canvas.width/2, 100, 600, 250, 0, 0, Math.PI * 2);
    ctx.fill();

    // South pole
    ctx.beginPath();
    ctx.ellipse(canvas.width/2, canvas.height - 100, 800, 300, 0, 0, Math.PI * 2);
    ctx.fill();

    // Add clouds
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    
    const drawCloud = (x: number, y: number, size: number) => {
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.arc(x + size * 0.6, y - size * 0.2, size * 0.7, 0, Math.PI * 2);
      ctx.arc(x - size * 0.6, y - size * 0.2, size * 0.7, 0, Math.PI * 2);
      ctx.fill();
    };

    // Scattered clouds
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = 30 + Math.random() * 50;
      drawCloud(x, y, size);
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
    roughness: 0.6,
    clearcoat: 0.8,
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
