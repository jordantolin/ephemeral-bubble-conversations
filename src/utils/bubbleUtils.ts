
import * as THREE from 'three';
import { BubbleData } from '@/types/bubble';

const BUBBLE_COLOR = 0xebc942;

export const createBubbleGeometry = (size: number) => {
  return new THREE.SphereGeometry(size, 32, 32);
};

export const createBubbleMaterial = () => {
  return new THREE.MeshStandardMaterial({
    color: BUBBLE_COLOR,
    emissive: BUBBLE_COLOR,
    emissiveIntensity: 0.2,
    metalness: 0.1,
    roughness: 0.2,
    transparent: true,
    opacity: 0.9
  });
};

export const createTextCanvas = (
  topicData: BubbleData,
  reflectScale: number
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext('2d');
  
  if (context) {
    context.fillStyle = '#000000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = 'destination-out';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = 'source-over';
    
    const nameSize = Math.floor(canvas.height * 0.12 * reflectScale);
    const topicSize = Math.floor(canvas.height * 0.11 * reflectScale);
    const usernameSize = Math.floor(canvas.height * 0.10 * reflectScale);
    const reflectSize = Math.floor(canvas.height * 0.09 * reflectScale);
    
    const spacing = canvas.height * 0.14;
    const startY = canvas.height/2 - spacing * 1.5;

    const drawText = (text: string, y: number, fontSize: number) => {
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.strokeStyle = '#000000';
      context.lineWidth = fontSize * 0.2;
      context.lineJoin = 'round';
      context.font = `bold ${fontSize}px Inter`;
      context.strokeText(text, canvas.width/2, y);
      context.fillStyle = '#FFFFFF';
      context.fillText(text, canvas.width/2, y);
    };

    drawText(topicData.name, startY, nameSize);
    drawText(topicData.topic, startY + spacing, topicSize);
    drawText(topicData.username, startY + spacing * 2, usernameSize);
    drawText(`⭐ ${topicData.reflect_count}`, startY + spacing * 3, reflectSize);
  }

  return canvas;
};

export const calculateBubblePosition = (index: number, totalBubbles: number, radius: number) => {
  const angle = (index / totalBubbles) * Math.PI * 2;
  const phi = Math.acos(-1 + (2 * index) / totalBubbles);
  const theta = Math.sqrt(totalBubbles * Math.PI) * phi;
  
  return {
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle) * Math.cos(theta * 0.5),
    z: radius * Math.sin(angle) * Math.sin(theta * 0.5),
    angle
  };
};
