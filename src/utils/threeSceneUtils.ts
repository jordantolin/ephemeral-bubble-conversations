import * as THREE from 'three';

// Store the canvas globally so it persists between re-renders
let globalCanvas: HTMLCanvasElement | null = null;

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
    scene.background = new THREE.Color(0x1a1a2e); // Dark blue background
    scene.fog = new THREE.Fog(0x1a1a2e, 10, 50); // Match fog to background
    
    console.log('DEBUG RENDERING: Scene creata con sfondo scuro');
    
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
    
    // Check if we need to create a new renderer or if we can reuse the existing one
    let renderer: THREE.WebGLRenderer;
    
    if (globalCanvas && globalCanvas.isConnected) {
      // Reuse existing renderer
      console.log('ThreeScene: Riutilizzo renderer esistente');
      renderer = new THREE.WebGLRenderer({ canvas: globalCanvas });
      renderer.setSize(container.clientWidth, container.clientHeight);
    } else {
      // Create new renderer
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
        renderer.setClearColor(0x1a1a2e, 1); // Dark blue background
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
        
        // Set a fixed ID to the canvas for easier debugging
        const domElement = renderer.domElement;
        domElement.id = 'three-js-canvas';
        
        // Force the canvas to be visible with fixed positioning
        domElement.style.width = '100%';
        domElement.style.height = '100%';
        domElement.style.position = 'absolute';
        domElement.style.top = '0';
        domElement.style.left = '0';
        domElement.style.zIndex = '5';
        domElement.style.border = '2px solid blue'; // Visible border for debugging
        
        // Store the canvas globally so we can reuse it
        globalCanvas = domElement;
        
        // CRITICAL: Make the container relative positioned to properly contain the absolute canvas
        container.style.position = 'relative';
        container.style.minHeight = '300px';
        container.style.minWidth = '300px';
        container.style.display = 'block';
        container.style.visibility = 'visible';
        container.style.overflow = 'hidden'; // Prevent canvas from spilling out
        
        // Use forced layout to ensure DOM is ready, then append the canvas
        void container.getBoundingClientRect();
        
        // CRITICAL: Ensure immediate execution to avoid React re-rendering issues
        setTimeout(() => {
          try {
            if (!domElement.isConnected) {
              console.log("Aggiungo canvas a:", container);
              container.appendChild(domElement);
              console.log("Canvas dopo append:", container.querySelector("canvas"));
              
              // Force repaint to ensure visibility
              void domElement.getBoundingClientRect();
            } else {
              console.log("Canvas già presente nel DOM");
            }
          } catch (e) {
            console.error("ThreeScene: Errore durante l'aggiunta del canvas al container:", e);
            onError("Errore nell'aggiunta del canvas al DOM");
          }
        }, 0);
        
        // Add event listener to ensure canvas stays in DOM after React updates
        const observer = new MutationObserver((mutations) => {
          for (let mutation of mutations) {
            if (mutation.type === 'childList') {
              for (let node of Array.from(mutation.removedNodes)) {
                if (node === domElement) {
                  console.error('DEBUG CANVAS: Canvas was removed from the DOM!');
                  
                  // Try to re-append it immediately
                  console.log('DEBUG CANVAS: Attempting to re-append canvas');
                  setTimeout(() => {
                    if (!domElement.isConnected && container.isConnected) {
                      container.appendChild(domElement);
                      console.log('Canvas re-appended to container');
                    }
                  }, 0);
                }
              }
            }
          }
        });
        
        observer.observe(container, { childList: true, subtree: true });
      } catch (e) {
        console.error("ThreeScene: Errore durante la creazione del renderer WebGL:", e);
        onError("Errore creazione renderer WebGL");
        return null;
      }
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
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xebbd34, 
      metalness: 0.3,
      roughness: 0.4
    });
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
  
  // We don't remove the canvas anymore, just clear the scene and dispose materials
  // This helps maintain the canvas in the DOM between renders
  
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
    // Don't dispose of the renderer or force context loss
    // This will keep the canvas element alive
    console.log('ThreeScene: Renderer cleaned but canvas preserved');
  }
};
