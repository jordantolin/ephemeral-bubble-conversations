
import * as THREE from 'three';

// Initialize a basic Three.js scene with camera, renderer, and lighting
export const initializeThreeScene = (
  container: HTMLDivElement,
  onError: (error: string) => void
): {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
} | null => {
  try {
    console.log('ThreeScene: Inizializzazione scena');
    
    // Check if container has valid dimensions
    if (container.clientWidth <= 0 || container.clientHeight <= 0) {
      console.error('ThreeScene: Dimensioni del container non valide', {
        width: container.clientWidth,
        height: container.clientHeight
      });
      onError("Container dimensioni non valide");
      return null;
    }
    
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 10, 50);
    
    // Create camera with better parameters for our use case
    const camera = new THREE.PerspectiveCamera(
      75, // Field of view
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 15;
    
    // Create renderer with error handling
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        precision: 'highp'
      });
      
      console.log('ThreeScene: Renderer creato, configurazione dimensioni:', {
        containerWidth: container.clientWidth,
        containerHeight: container.clientHeight
      });
      
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
      renderer.setClearColor(0x000000, 0); // Transparent background
      renderer.shadowMap.enabled = false; // Disable shadows for performance
      
      // Make sure we can append to the container
      if (!container) {
        throw new Error("Container element is null");
      }
      
      // Check if container is in the DOM
      if (!container.isConnected) {
        console.error("ThreeScene: Il container non è collegato al DOM");
        onError("Container non collegato al DOM");
        return null;
      }
      
      // Verify canvas element can be created
      const testCanvas = document.createElement('canvas');
      if (!testCanvas) {
        console.error("ThreeScene: Impossibile creare elemento canvas");
        onError("Impossibile creare canvas");
        return null;
      }
      
      // Append to DOM and set style properties
      try {
        container.appendChild(renderer.domElement);
        
        // Set explicit dimensions via style to ensure visibility
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.position = 'absolute';
        
        // Force repaint to ensure visibility
        renderer.domElement.getBoundingClientRect();
        
        console.log('ThreeScene: Canvas aggiunto al container con successo');
      } catch (e) {
        console.error("ThreeScene: Errore durante l'aggiunta del canvas al container:", e);
        onError("Errore nell'aggiunta del canvas al DOM");
        return null;
      }
      
    } catch (e) {
      console.error("ThreeScene: Errore durante la creazione del renderer WebGL:", e);
      onError("Errore creazione renderer WebGL");
      return null;
    }
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);
    
    const pointLight = new THREE.PointLight(0xffffcc, 0.8, 30);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);
    
    return { scene, camera, renderer };
  } catch (error) {
    console.error("ThreeScene: Errore inizializzazione scena 3D:", error);
    onError("Errore inizializzazione scena 3D");
    return null;
  }
};

// Generate points evenly distributed on a sphere
export const generatePointsOnSphere = (count: number, radius: number, fallbackPositions: Array<{x: number, y: number, z: number}>) => {
  try {
    const points = [];
    
    // Special case for small counts
    if (count <= 6) {
      return fallbackPositions.slice(0, count).map(p => ({
        x: p.x * radius / 5,
        y: p.y * radius / 5,
        z: p.z * radius / 5
      }));
    }
    
    // Use fibonacci sphere for better distribution
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2; // y goes from 1 to -1
      const radiusAtY = Math.sqrt(1 - y * y); // radius at y
      
      // Golden angle increment gives better distribution
      const theta = 2 * Math.PI * i / goldenRatio;
      
      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;
      
      points.push({
        x: x * radius,
        y: y * radius,
        z: z * radius
      });
    }
    
    return points;
  } catch (e) {
    console.error("ThreeScene: Errore generazione punti sfera:", e);
    // Return fallback positions
    return fallbackPositions.map(p => ({
      x: p.x * radius / 5,
      y: p.y * radius / 5,
      z: p.z * radius / 5
    }));
  }
};

// Clean up Three.js resources
export const cleanupThreeScene = (
  container: HTMLDivElement | null,
  renderer: THREE.WebGLRenderer | null,
  bubbleRefs: { [key: string]: THREE.Group }
) => {
  console.log('ThreeScene: Pulizia risorse');
  
  if (container && renderer && renderer.domElement) {
    try {
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    } catch (e) {
      console.error("ThreeScene: Errore rimozione renderer:", e);
    }
  }
  
  // Dispose of 3D objects
  Object.values(bubbleRefs).forEach((group) => {
    group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      }
    });
  });
  
  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
    const gl = renderer.getContext();
    if (gl && typeof gl.getExtension === 'function') {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  }
};
