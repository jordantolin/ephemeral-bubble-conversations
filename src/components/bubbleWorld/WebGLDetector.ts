
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
      
      // Additional capability check with proper type narrowing
      if (gl instanceof WebGLRenderingContext || gl instanceof WebGL2RenderingContext) {
        return true; // If we got a context, WebGL is available
      } else {
        return false;
      }
    } catch (e) {
      console.error('WebGL detection error:', e);
      return false;
    }
  }
};

export default WebGLDetector;
