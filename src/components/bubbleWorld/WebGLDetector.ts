
import * as THREE from 'three';

/**
 * Utility to detect WebGL support and capabilities
 */
export const WebGLDetector = {
  /**
   * Check if WebGL is supported in this browser
   */
  isWebGLAvailable: (): boolean => {
    try {
      // Create temporary canvas for WebGL detection
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || 
               canvas.getContext('experimental-webgl') || 
               canvas.getContext('webgl2');
      
      // Check if context creation was successful
      if (!gl) {
        console.log('WebGL not supported, falling back to 2D mode');
        return false;
      }
      
      // Additional capability check - with type guard
      if (gl && 'getSupportedExtensions' in gl) {
        const extensionsSupported = gl.getSupportedExtensions();
        if (!extensionsSupported || extensionsSupported.length < 5) {
          console.log('WebGL supported but with limited extensions, using 2D mode');
          return false;
        }
      } else {
        return false;
      }
      
      // Check for Three.js specific requirements
      try {
        // Basic Three.js initialization test
        const testRenderer = new THREE.WebGLRenderer();
        if (!testRenderer) {
          throw new Error('THREE renderer initialization failed');
        }
        
        console.log('WebGL supported with Three.js, using 3D mode');
        return true;
      } catch (e) {
        console.error('Three.js initialization test failed:', e);
        return false;
      }
    } catch (e) {
      console.error('WebGL detection error:', e);
      return false;
    }
  }
};

export default WebGLDetector;
