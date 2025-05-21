
import { 
  createOptimizedBubbleGeometry, 
  createOptimizedBubbleMaterial,
  getDetailLevelForDevice
} from '../optimizationUtils';
import * as THREE from 'three';
import '@testing-library/jest-dom';

// Mock the window innerWidth and navigator
beforeAll(() => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    value: 1920
  });

  Object.defineProperty(navigator, 'userAgent', {
    writable: true,
    value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
  });
});

describe('Three.js Optimization Utils', () => {
  describe('createOptimizedBubbleGeometry', () => {
    it('creates a geometry with the correct size', () => {
      const size = 2;
      const geometry = createOptimizedBubbleGeometry(size);
      
      // Get the bounding sphere to check size
      geometry.computeBoundingSphere();
      expect(geometry.boundingSphere?.radius).toBeCloseTo(size);
    });
    
    it('creates geometry with different detail levels', () => {
      const lowDetail = createOptimizedBubbleGeometry(1, 2);
      const highDetail = createOptimizedBubbleGeometry(1, 4);
      
      // Higher detail should have more vertices
      expect(lowDetail.attributes.position.count).toBeLessThan(highDetail.attributes.position.count);
    });
  });
  
  describe('createOptimizedBubbleMaterial', () => {
    it('creates a material with correct properties', () => {
      const material = createOptimizedBubbleMaterial();
      
      expect(material.transparent).toBe(true);
      expect(material.side).toBe(THREE.DoubleSide);
      expect(material.opacity).toBe(0.8);
    });
  });
  
  describe('getDetailLevelForDevice', () => {
    it('returns higher detail for desktop devices', () => {
      // Desktop test
      window.innerWidth = 1920;
      const detailLevel = getDetailLevelForDevice();
      expect(detailLevel).toBeGreaterThanOrEqual(4);
    });
    
    it('returns lower detail for mobile devices', () => {
      // Mobile test
      window.innerWidth = 375;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X)'
      });
      
      const detailLevel = getDetailLevelForDevice();
      expect(detailLevel).toBeLessThanOrEqual(2);
    });
  });
});
