
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
    console.log('DEBUG CANVAS: Container element:', container);
    
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
    scene.background = new THREE.Color(0xff0000); // DEBUG: Forza sfondo rosso per debugging
    scene.fog = new THREE.Fog(0xff0000, 10, 50); // Match fog to background
    
    console.log('DEBUG RENDERING: Scene creata con sfondo rosso');
    
    // Create camera with better parameters for our use case
    const camera = new THREE.PerspectiveCamera(
      75, // Field of view
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 15;
    
    console.log('DEBUG RENDERING: Camera creata', {
      aspect: camera.aspect,
      position: camera.position
    });
    
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
      renderer.setClearColor(0xff0000, 1); // DEBUG: Forza sfondo rosso completamente opaco
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
      
      // Debug container visibility before appending
      const containerStyles = window.getComputedStyle(container);
      console.log('DEBUG CANVAS: Container styles before appending canvas', {
        display: containerStyles.display,
        visibility: containerStyles.visibility,
        opacity: containerStyles.opacity,
        width: containerStyles.width,
        height: containerStyles.height,
        position: containerStyles.position,
        zIndex: containerStyles.zIndex
      });
      
      // Append to DOM and set style properties
      try {
        console.log("Aggiungo canvas a:", container);
        container.appendChild(renderer.domElement);
        console.log("Canvas dopo append:", container.querySelector("canvas"));
        
        // Per debugging - fissa il canvas in posizione assoluta visibile
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.display = 'block';
        
        // Debug: usa position fixed come suggerito per forzare la visibilità
        renderer.domElement.style.position = 'fixed';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.left = '0';
        renderer.domElement.style.zIndex = '9999';  // Altissimo z-index per debug
        renderer.domElement.style.border = '5px solid magenta'; // Bordo molto visibile
        
        // Force repaint to ensure visibility
        renderer.domElement.getBoundingClientRect();
        
        // Set a fixed ID to the canvas for easier debugging
        renderer.domElement.id = 'three-js-canvas';
        
        console.log('DEBUG CANVAS: Canvas aggiunto al container con successo');
        console.log('DEBUG CANVAS: Canvas dimensions', {
          width: renderer.domElement.width,
          height: renderer.domElement.height,
          styleWidth: renderer.domElement.style.width,
          styleHeight: renderer.domElement.style.height
        });
        
        // Verify canvas is in the DOM
        console.log('DEBUG CANVAS: Canvas is in DOM?', renderer.domElement.isConnected);
        
        // Add a DOM mutation observer to detect if the canvas gets removed
        const observer = new MutationObserver((mutations) => {
          for (let mutation of mutations) {
            if (mutation.type === 'childList') {
              for (let node of Array.from(mutation.removedNodes)) {
                if (node === renderer.domElement) {
                  console.error('DEBUG CANVAS: Canvas was removed from the DOM!');
                  
                  // Try to re-append it immediately
                  try {
                    console.log('DEBUG CANVAS: Attempting to re-append canvas');
                    container.appendChild(renderer.domElement);
                  } catch (e) {
                    console.error('DEBUG CANVAS: Failed to re-append canvas:', e);
                  }
                }
              }
            }
          }
        });
        
        observer.observe(container, { childList: true, subtree: true });
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
    
    // Draw something simple to ensure we can see rendering
    const geometry = new THREE.SphereGeometry(5, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
    
    console.log('DEBUG RENDERING: Test sphere added to scene');
    
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
        console.log('DEBUG CLEANUP: Removing canvas from container');
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
