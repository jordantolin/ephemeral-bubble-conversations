
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
  const canvas = document.createElement('canvas');
  canvas.width = 4096;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    // Vibrant ocean base
    const oceanGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    oceanGradient.addColorStop(0, '#60A5FA'); // Bright blue
    oceanGradient.addColorStop(1, '#3B82F6'); // Slightly darker blue
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
          // Use bezier curves for smoother, cartoon-like edges
          const prevPoint = path[index - 1];
          const cpX = (prevPoint[0] + x) / 2;
          const cpY = (prevPoint[1] + y) / 2;
          ctx.quadraticCurveTo(prevPoint[0], prevPoint[1], cpX, cpY);
        }
      });
      ctx.closePath();

      // Add cartoon-style shadows
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 5;
      ctx.shadowOffsetY = 5;

      // Fill with vibrant green
      ctx.fillStyle = color;
      ctx.fill();

      // Add highlight effect
      ctx.shadowColor = 'transparent';
      const highlight = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      highlight.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
      highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = highlight;
      ctx.fill();
    };

    // Simplified continent shapes for cartoon style
    const continents = {
      northAmerica: [
        [820, 280], [1000, 200], [1300, 220], [1400, 380],
        [1200, 500], [900, 480], [800, 400], [780, 300]
      ],
      southAmerica: [
        [1050, 600], [1200, 700], [1150, 900], [1000, 1000],
        [900, 900], [950, 700]
      ],
      europe: [
        [1900, 250], [2200, 200], [2400, 300], [2200, 400],
        [1950, 350]
      ],
      africa: [
        [1950, 450], [2200, 420], [2400, 500], [2300, 800],
        [2100, 850], [1900, 700]
      ],
      asia: [
        [2350, 200], [2800, 200], [3200, 300], [3000, 500],
        [2700, 600], [2400, 400]
      ],
      australia: [
        [3000, 700], [3200, 750], [3200, 900], [3000, 850],
        [2900, 800]
      ]
    };

    // Draw each continent with cartoon style
    Object.entries(continents).forEach(([name, path]) => {
      drawContinent(path, '#4ADE80'); // Vibrant green for lands
    });

    // Add cartoon-style ice caps
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 5;

    // North pole
    ctx.fillStyle = '#F1F5F9';
    ctx.beginPath();
    ctx.ellipse(canvas.width/2, 100, 500, 200, 0, 0, Math.PI * 2);
    ctx.fill();

    // South pole
    ctx.beginPath();
    ctx.ellipse(canvas.width/2, canvas.height - 100, 500, 200, 0, 0, Math.PI * 2);
    ctx.fill();

    // Add cute cloud details
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

    // Add some scattered clouds
    for (let i = 0; i < 12; i++) {
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
