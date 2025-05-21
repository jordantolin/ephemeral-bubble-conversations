
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
        console.warn('WebGL non supportato, modalità 2D sarà usata come fallback');
        return false;
      }
      
      // Try to use some WebGL features to ensure it's working
      try {
        gl.viewport(0, 0, canvas.width, canvas.height);
        return true;
      } catch (e) {
        console.error('Errore durante il test WebGL:', e);
        return false;
      }
    } catch (e) {
      console.error('Errore rilevamento WebGL:', e);
      return false;
    }
  },
  
  /**
   * More thorough test that tries to create an actual Three.js scene
   */
  testThreeCapabilities: (): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        // Creazione di un canvas di test
        const testCanvas = document.createElement('canvas');
        testCanvas.width = 1;
        testCanvas.height = 1;
        
        // Tentativo di creazione di una scena Three.js
        const testScene = new THREE.Scene();
        const testCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 10);
        testCamera.position.z = 5;
        
        // Oggetto test (cubo)
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const cube = new THREE.Mesh(geometry, material);
        testScene.add(cube);
        
        // Creazione renderer
        let renderer: THREE.WebGLRenderer;
        try {
          renderer = new THREE.WebGLRenderer({
            canvas: testCanvas,
            antialias: false,
            alpha: true,
            powerPreference: 'default'
          });
          
          // Tentativo di rendering
          renderer.render(testScene, testCamera);
          
          // Pulizia
          geometry.dispose();
          material.dispose();
          renderer.dispose();
          
          console.log('Test Three.js passato con successo');
          resolve(true);
        } catch (e) {
          console.error('Errore durante il test del renderer Three.js:', e);
          resolve(false);
        }
      } catch (e) {
        console.error('Errore durante il test delle capacità Three.js:', e);
        resolve(false);
      }
    });
  },

  /**
   * Comprehensive capability check with multiple tests
   */
  checkWebGLCompatibility: async (): Promise<{supported: boolean, reason?: string}> => {
    // Step 1: Basic WebGL availability
    const isBasicWebGLAvailable = WebGLDetector.isWebGLAvailable();
    if (!isBasicWebGLAvailable) {
      return { 
        supported: false, 
        reason: "WebGL non è supportato in questo browser" 
      };
    }
    
    // Step 2: Check Three.js capabilities
    const threeCapabilities = await WebGLDetector.testThreeCapabilities();
    if (!threeCapabilities) {
      return { 
        supported: false, 
        reason: "Il browser non supporta Three.js correttamente" 
      };
    }
    
    // Step 3: Check for mobile-specific limitations
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isLowEndDevice = navigator.deviceMemory && navigator.deviceMemory < 4;
    
    if (isMobile && isLowEndDevice) {
      console.warn("Dispositivo mobile con memoria limitata - potrebbe funzionare ma con prestazioni ridotte");
    }
    
    return { supported: true };
  }
};

export default WebGLDetector;
