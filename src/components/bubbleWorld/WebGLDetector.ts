
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
      
      // Additional capability check with proper type narrowing
      if (gl instanceof WebGLRenderingContext || gl instanceof WebGL2RenderingContext) {
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
        const testRenderer = new THREE.WebGLRenderer({
          canvas: document.createElement('canvas'),
          antialias: false,
          alpha: true
        });
        
        if (!testRenderer) {
          throw new Error('THREE renderer initialization failed');
        }
        
        // Test if we can create a basic scene
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        camera.position.z = 5;
        
        // Try to render a frame
        testRenderer.setSize(10, 10);
        testRenderer.render(scene, camera);
        
        // Clean up
        testRenderer.dispose();
        
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
