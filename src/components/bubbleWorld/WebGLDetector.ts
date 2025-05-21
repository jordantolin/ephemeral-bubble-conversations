
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
      
      // Try to get WebGL context - first try WebGL2, then fall back to WebGL1
      const gl = canvas.getContext('webgl2') || 
               canvas.getContext('webgl') || 
               canvas.getContext('experimental-webgl');
      
      // Check if context creation was successful
      if (!gl) {
        console.log('WebGL not supported, falling back to 2D mode');
        return false;
      }
      
      // Perform an additional capability test by creating a test renderer
      try {
        const testRenderer = new THREE.WebGLRenderer({ canvas });
        testRenderer.dispose();
        return true;
      } catch (e) {
        console.error('WebGL renderer test failed:', e);
        return false;
      }
    } catch (e) {
      console.error('WebGL detection error:', e);
      return false;
    }
  },
  
  /**
   * More thorough test that tries to create an actual Three.js scene
   */
  testThreeCapabilities: (): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        const testCanvas = document.createElement('canvas');
        testCanvas.width = 1;
        testCanvas.height = 1;
        
        // Try to create an entire test scene
        const testScene = new THREE.Scene();
        const testCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 10);
        testCamera.position.z = 5;
        
        // Create a simple cube to test rendering
        const geometry = new THREE.BoxGeometry();
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const cube = new THREE.Mesh(geometry, material);
        testScene.add(cube);
        
        // Try to create the renderer
        const renderer = new THREE.WebGLRenderer({
          canvas: testCanvas,
          antialias: false,
          alpha: true
        });
        
        // Attempt a render
        renderer.render(testScene, testCamera);
        
        // Clean up
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        
        console.log('Full Three.js capability test passed');
        resolve(true);
      } catch (e) {
        console.error('Full Three.js capability test failed:', e);
        resolve(false);
      }
    });
  }
};

export default WebGLDetector;
