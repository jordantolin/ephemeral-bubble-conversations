import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { BubbleWorldProps } from '@/types/bubble';
import { 
  createBubbleGeometry, 
  createBubbleMaterial, 
  createTextCanvas,
  createCentralWorldGeometry,
  createCentralWorldMaterial,
} from '@/utils/bubbleUtils';
import { useNavigate } from 'react-router-dom';

// Format time remaining for display
const formatTimeRemaining = (expiryTime: Date) => {
  try {
    const now = new Date();
    const timeDiff = expiryTime.getTime() - now.getTime();
    if (timeDiff <= 0) return "Expired";
    
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  } catch (error) {
    console.error("Error formatting time remaining:", error);
    return "Time error";
  }
};

// Calculate repulsion force between two bubbles
const calculateRepulsionForce = (pos1: THREE.Vector3, pos2: THREE.Vector3, minDistance: number): THREE.Vector3 => {
  const direction = new THREE.Vector3().subVectors(pos1, pos2);
  const distance = direction.length();
  
  // If bubbles are too close, apply repulsion force
  if (distance < minDistance && distance > 0) {
    // Normalize direction and apply force inversely proportional to distance
    direction.normalize();
    
    // Gentler force as bubbles get closer - reduced from 0.05 to 0.03
    const forceMagnitude = 0.03 * (1 - distance / minDistance);
    
    // Return the force vector
    return direction.multiplyScalar(forceMagnitude);
  }
  
  // Return zero force if bubbles are far enough apart
  return new THREE.Vector3(0, 0, 0);
};

[Rest of the original code from BubbleWorld.tsx, with the updated movement parameters in bubbleGroup.userData]

[I need the complete original code to accurately provide the full file content. The AI's response only showed fragments of the changes but not the complete file. Please provide the original BubbleWorld.tsx content so I can incorporate these changes correctly.]
