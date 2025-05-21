
import * as THREE from 'three';

/**
 * Creates optimized geometry with lower polygon count based on device performance
 * @param size The size of the bubble
 * @param detail The level of detail (lower for mobile/low-performance devices)
 */
export const createOptimizedBubbleGeometry = (size: number, detail: number = 8): THREE.BufferGeometry => {
  // Use icosahedron for better performance than SphereGeometry with similar visual results
  const geometry = new THREE.IcosahedronGeometry(size, detail);
  
  // Optimize the geometry by merging vertices
  geometry.deleteAttribute('normal');
  geometry.deleteAttribute('uv');
  
  // Recompute normals only (we don't need UVs for basic materials)
  geometry.computeVertexNormals();
  
  return geometry;
};

/**
 * Creates an optimized material with appropriate settings for performance
 */
export const createOptimizedBubbleMaterial = (): THREE.MeshPhysicalMaterial => {
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xebbd34,
    transmission: 0.5,
    opacity: 0.8,
    metalness: 0.2,
    roughness: 0.2,
    transparent: true,
    side: THREE.DoubleSide,
  });
  
  return material;
};

/**
 * Detects device capability and returns appropriate detail level
 */
export const getDetailLevelForDevice = (): number => {
  // Check for mobile device
  const isMobile = window.innerWidth < 768 || 
                   /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Check GPU performance if supported
  if ('gpu' in navigator) {
    // Future-proofing for when this API becomes widely available
    return isMobile ? 2 : 4;
  }
  
  // Fallback based on screen size and mobile detection
  if (isMobile) return 2; // Low detail for mobile
  if (window.innerWidth < 1200) return 3; // Medium detail for smaller screens
  return 4; // Higher detail for large screens
};

/**
 * Handles object pooling for particle effects to reduce GC pressure
 */
export class ParticlePool {
  private pool: THREE.Points[] = [];
  private scene: THREE.Scene;
  private maxPoolSize: number;
  
  constructor(scene: THREE.Scene, initialSize: number = 10, maxPoolSize: number = 30) {
    this.scene = scene;
    this.maxPoolSize = maxPoolSize;
    
    // Pre-populate the pool
    for (let i = 0; i < initialSize; i++) {
      this.createParticle();
    }
  }
  
  private createParticle(): THREE.Points {
    // Create a basic particle system that can be reused
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.PointsMaterial({
      size: 0.1,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    const particle = new THREE.Points(geometry, material);
    particle.visible = false;
    this.scene.add(particle);
    this.pool.push(particle);
    
    return particle;
  }
  
  public getParticle(): THREE.Points {
    // Find an available particle in the pool
    const available = this.pool.find(p => !p.visible);
    
    if (available) {
      available.visible = true;
      return available;
    }
    
    // Create new particle if pool isn't full
    if (this.pool.length < this.maxPoolSize) {
      const newParticle = this.createParticle();
      newParticle.visible = true;
      return newParticle;
    }
    
    // If pool is full, reuse the oldest particle
    const reuse = this.pool.shift();
    if (reuse) {
      this.pool.push(reuse);
      reuse.visible = true;
      return reuse;
    }
    
    // Fallback - should never reach here
    return this.createParticle();
  }
  
  public releaseParticle(particle: THREE.Points): void {
    // Reset the particle for reuse
    particle.visible = false;
    
    // Clear any previous data
    if (particle.geometry.attributes.position) {
      particle.geometry.attributes.position.array.fill(0);
      particle.geometry.attributes.position.needsUpdate = true;
    }
    
    if (particle.geometry.attributes.color) {
      particle.geometry.attributes.color.array.fill(1);
      particle.geometry.attributes.color.needsUpdate = true;
    }
    
    // Reset material properties
    if (particle.material instanceof THREE.PointsMaterial) {
      particle.material.opacity = 1;
    }
  }
  
  public dispose(): void {
    // Clean up all resources
    this.pool.forEach(particle => {
      this.scene.remove(particle);
      particle.geometry.dispose();
      if (Array.isArray(particle.material)) {
        particle.material.forEach(m => m.dispose());
      } else {
        particle.material.dispose();
      }
    });
    
    this.pool = [];
  }
}

/**
 * Implements frustum culling for better performance
 */
export class FrustumCullingManager {
  private camera: THREE.Camera;
  private frustum: THREE.Frustum;
  private cameraViewProjectionMatrix: THREE.Matrix4;
  
  constructor(camera: THREE.Camera) {
    this.camera = camera;
    this.frustum = new THREE.Frustum();
    this.cameraViewProjectionMatrix = new THREE.Matrix4();
  }
  
  public update(): void {
    this.cameraViewProjectionMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.cameraViewProjectionMatrix);
  }
  
  public isVisible(object: THREE.Object3D, boundingSphereRadius: number = 1): boolean {
    // For simple objects, just use position and a bounding sphere
    const position = object.position;
    return this.frustum.containsPoint(position) || 
           this.frustum.intersectsSphere(new THREE.Sphere(position, boundingSphereRadius));
  }
}
