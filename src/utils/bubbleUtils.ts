
import * as THREE from 'three';
import { BubbleData } from "@/types/bubble";
import { connectionManager } from "./connectionManager";

// Export the connection manager for direct use
export { connectionManager };

/**
 * Calcola se una bolla è scaduta
 */
export function isBubbleExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return true;
  
  try {
    const expiryTime = new Date(expiresAt);
    const now = new Date();
    return expiryTime < now;
  } catch (error) {
    console.error("Error checking bubble expiry:", error);
    return true; // Consider expired on error
  }
}

/**
 * Calcola se mostrare una bolla nel feed
 * Mostra bolle non scadute e bolle scadute da meno di 24 ore
 */
export function shouldShowInFeed(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  
  try {
    const expiryTime = new Date(expiresAt);
    const now = new Date();
    
    // Se non è scaduta, mostrala
    if (expiryTime > now) return true;
    
    // Se è scaduta, controlla se è entro 24h dalla scadenza
    const cutoffTime = new Date(expiryTime);
    cutoffTime.setHours(cutoffTime.getHours() + 24);
    
    return now < cutoffTime;
  } catch (error) {
    console.error("Error checking bubble visibility:", error);
    return false;
  }
}

/**
 * Calcola le dimensioni della bolla in base al numero di riflessioni
 */
export function calculateBubbleSize(reflectCount: number): "sm" | "md" | "lg" {
  if (reflectCount >= 10) {
    return "lg";
  } else if (reflectCount >= 5) {
    return "md";
  }
  return "sm";
}

/**
 * Genera un ID casuale per una bolla
 */
export function generateBubbleId(): string {
  return `bubble-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Genera dati di esempio per le bolle
 */
export function generateSampleBubbles(count: number = 5): BubbleData[] {
  const topics = ["React", "JavaScript", "TypeScript", "CSS", "HTML"];
  const sizes: ("sm" | "md" | "lg")[] = ["sm", "md", "lg"];
  const names = ["Thinking...", "Idea!", "Question", "Cool stuff", "Discovery"];
  
  return Array.from({ length: count }).map((_, index) => {
    const now = new Date();
    const expiryHours = 2 + Math.floor(Math.random() * 5); // 2-7 hours
    const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);
    
    return {
      id: generateBubbleId(),
      topic: topics[index % topics.length],
      name: `${names[index % names.length]} ${index + 1}`,
      username: `user${index + 1}`,
      size: sizes[Math.floor(Math.random() * sizes.length)],
      created_at: now.toISOString(),
      reflect_count: Math.floor(Math.random() * 15),
      expires_at: expiresAt.toISOString(),
      isExploding: false
    };
  });
}

/**
 * Create bubble geometry with enhanced appearance
 */
export function createBubbleGeometry(size: number = 1): THREE.SphereGeometry {
  return new THREE.SphereGeometry(size, 32, 32);
}

/**
 * Create bubble material with enhanced appearance
 */
export function createBubbleMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#FFD700'), // Gold color for bubbles
    metalness: 0.1,
    roughness: 0.2,
    transmission: 0.6,
    thickness: 0.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    transparent: true,
    opacity: 0.7,
  });
}

/**
 * Create text canvas for bubble labels
 */
export function createTextCanvas(text: string, fontSize: number = 32): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d') as CanvasRenderingContext2D;
  
  // Set canvas size - bigger for better quality
  canvas.width = 512;
  canvas.height = 256;
  
  // Clear background to transparent
  context.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw text with shadow for better visibility
  context.font = `bold ${fontSize}px Arial, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  
  // Add shadow
  context.shadowColor = 'rgba(0, 0, 0, 0.5)';
  context.shadowBlur = 5;
  context.shadowOffsetX = 2;
  context.shadowOffsetY = 2;
  
  // Text color
  context.fillStyle = '#ffffff';
  
  // Fill text
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  
  return canvas;
}

/**
 * Create central world geometry with enhanced appearance
 */
export function createCentralWorldGeometry(): THREE.IcosahedronGeometry {
  return new THREE.IcosahedronGeometry(1, 3);
}

/**
 * Create central world material with enhanced appearance
 */
export function createCentralWorldMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#FBE8A6'),
    metalness: 0.3,
    roughness: 0.4,
    transmission: 0.2,
    clearcoat: 0.8,
    emissive: new THREE.Color('#FBE8A6'),
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 0.9,
  });
}
