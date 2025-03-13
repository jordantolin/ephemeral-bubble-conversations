
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

/**
 * Loads a GLB/GLTF model with optional DRACO compression support
 * @param path Path to the GLB/GLTF file
 * @param onProgress Optional progress callback
 * @returns Promise that resolves with the loaded model
 */
export const loadGLTFModel = (
  path: string, 
  onProgress?: (event: ProgressEvent<EventTarget>) => void
): Promise<THREE.Group> => {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    
    // Add DRACO decoder for compressed models (if needed)
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.5/');
    loader.setDRACOLoader(dracoLoader);
    
    loader.load(
      path,
      (gltf) => {
        console.log('Model loaded successfully:', path);
        resolve(gltf.scene);
      },
      onProgress,
      (error) => {
        console.error('Error loading model:', error);
        reject(error);
      }
    );
  });
};

/**
 * Sets up the model with standard properties
 * @param model The loaded model
 * @param scale Scale factor for the model
 */
export const setupModel = (model: THREE.Group, scale: number = 1): THREE.Group => {
  // Apply scale
  model.scale.set(scale, scale, scale);
  
  // Enable shadows
  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      
      // Enhance material if needed
      if (child.material) {
        const material = child.material as THREE.Material;
        material.needsUpdate = true;
      }
    }
  });
  
  return model;
};
