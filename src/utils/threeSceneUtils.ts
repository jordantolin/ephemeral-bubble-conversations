
import * as THREE from 'three';

// Store the canvas globally so it persists between re-renders
let globalCanvas: HTMLCanvasElement | null = null;
let rendererId = 0; // Use to track renderer instances

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
    const containerWidth = container.clientWidth || 500; // Fallback width if zero
    const containerHeight = container.clientHeight || 400; // Fallback height if zero
    
    console.log('ThreeScene: Container dimensions', {
      clientWidth: container.clientWidth,
      clientHeight: container.clientHeight,
      offsetWidth: container.offsetWidth,
      offsetHeight: container.offsetHeight,
      fallbackWidth: containerWidth,
      fallbackHeight: containerHeight
    });
    
    // Force container to have dimensions if they're not set
    if (container.clientWidth <= 0 || container.clientHeight <= 0) {
      console.warn('ThreeScene: Container has invalid dimensions, forcing minimum size');
      container.style.width = '100%';
      container.style.height = '500px';
      container.style.minWidth = '500px';
      container.style.minHeight = '400px';
    }
    
    // Create scene with BRIGHT RED background for debugging
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xFF0000); // BRIGHT RED for visibility
    scene.fog = new THREE.Fog(0xFF0000, 10, 50); // Match fog to background
    
    console.log('DEBUG RENDERING: Scene created with RED background for visibility');
    
    // Create camera with better parameters for our use case
    const camera = new THREE.PerspectiveCamera(
      75, // Field of view
      containerWidth / containerHeight,
      0.1,
      1000
    );
    camera.position.z = 15;
    
    console.log('DEBUG RENDERING: Camera created', {
      aspect: camera.aspect,
      position: camera.position
    });
    
    // Check if we need to create a new renderer or if we can reuse the existing one
    let renderer: THREE.WebGLRenderer;
    
    if (globalCanvas && globalCanvas.isConnected) {
      // Reuse existing renderer
      console.log('ThreeScene: Reusing existing canvas', globalCanvas);
      renderer = new THREE.WebGLRenderer({ canvas: globalCanvas, antialias: true });
      renderer.setSize(containerWidth, containerHeight, false); // Don't update style, just buffer size
      
      // Check if canvas is actually visible
      const canvasStyle = window.getComputedStyle(globalCanvas);
      console.log('ThreeScene: Existing canvas style:', {
        display: canvasStyle.display,
        visibility: canvasStyle.visibility,
        position: canvasStyle.position,
        zIndex: canvasStyle.zIndex
      });
    } else {
      // Create new renderer
      try {
        const currentId = ++rendererId;
        console.log(`ThreeScene: Creating new WebGL renderer (ID: ${currentId})`);
        
        renderer = new THREE.WebGLRenderer({ 
          antialias: true,
          alpha: false, // Disable alpha for better performance
          powerPreference: 'high-performance',
          precision: 'highp'
        });
        
        console.log('ThreeScene: Renderer created, setting dimensions:', {
          containerWidth,
          containerHeight
        });
        
        // IMPORTANT: Set size in pixels, not using style (which would be %)
        renderer.setSize(containerWidth, containerHeight, false);
        renderer.setPixelRatio(1); // Force 1:1 for performance and clarity
        
        // Set BRIGHT RED background color for maximum visibility during debugging
        renderer.setClearColor(0xFF0000, 1); // Pure RED
        
        // Make sure we can append to the container
        if (!container) {
          throw new Error("Container element is null");
        }
        
        // Check if container is in the DOM
        if (!container.isConnected) {
          console.error("ThreeScene: Container is not connected to the DOM");
          onError("Container not connected to DOM");
          return null;
        }
        
        // Set a fixed ID to the canvas for easier debugging
        const domElement = renderer.domElement;
        domElement.id = 'three-js-canvas';
        
        // Force the canvas to be visible with fixed dimensions and positioning
        // CRITICAL: Set FIXED dimensions in pixels, not percentages
        domElement.style.width = `${containerWidth}px`;
        domElement.style.height = `${containerHeight}px`;
        domElement.style.position = 'absolute';
        domElement.style.top = '0';
        domElement.style.left = '0';
        domElement.style.zIndex = '10';
        domElement.style.border = '5px solid red'; // Very visible border for debugging
        domElement.style.backgroundColor = '#ff0000'; // Red background for the canvas element
        
        // Store the canvas globally so we can reuse it
        globalCanvas = domElement;
        
        // CRITICAL: Make the container relative positioned to properly contain the absolute canvas
        container.style.position = 'relative';
        container.style.minHeight = '400px';
        container.style.minWidth = '400px';
        container.style.display = 'block';
        container.style.visibility = 'visible';
        container.style.overflow = 'visible'; // Changed from 'hidden' to ensure canvas is visible
        
        // Use forced layout to ensure DOM is ready, then append the canvas
        void container.getBoundingClientRect();
        
        // Force immediate canvas insertion
        if (!domElement.isConnected) {
          try {
            console.log("Adding canvas to container:", container);
            container.appendChild(domElement);
            console.log("Canvas after append:", container.querySelector("#three-js-canvas"));
            
            // Force repaint to ensure visibility
            void domElement.getBoundingClientRect();
            
            // Double check it was really added
            setTimeout(() => {
              const canvasCheck = document.getElementById('three-js-canvas');
              console.log('Canvas check after append timeout:', {
                found: !!canvasCheck,
                isConnected: canvasCheck?.isConnected,
                parent: canvasCheck?.parentElement
              });
            }, 100);
          } catch (e) {
            console.error("ThreeScene: Error adding canvas to container:", e);
            onError("Error adding canvas to DOM");
          }
        } else {
          console.log("Canvas already in DOM");
        }
        
        // Add ROBUST mutation observer to ensure canvas stays in DOM after React updates
        const observer = new MutationObserver((mutations) => {
          let canvasRemoved = false;
          
          for (let mutation of mutations) {
            if (mutation.type === 'childList') {
              // Check if canvas was removed in this mutation
              for (let node of Array.from(mutation.removedNodes)) {
                if (node === domElement) {
                  console.error('DEBUG CANVAS: Canvas was removed from the DOM!');
                  canvasRemoved = true;
                }
              }
            }
          }
          
          // If canvas was removed, try to re-append it
          if (canvasRemoved) {
            console.log('DEBUG CANVAS: Attempting to re-append canvas');
            setTimeout(() => {
              try {
                if (!domElement.isConnected && container.isConnected) {
                  console.log('Re-appending canvas to container');
                  container.appendChild(domElement);
                  
                  // Force canvas to be visible again
                  domElement.style.width = `${containerWidth}px`;
                  domElement.style.height = `${containerHeight}px`;
                  domElement.style.position = 'absolute';
                  domElement.style.top = '0';
                  domElement.style.left = '0';
                  domElement.style.zIndex = '10';
                  domElement.style.visibility = 'visible';
                  domElement.style.display = 'block';
                  
                  console.log('Canvas re-appended to container');
                  
                  // Check canvas is visible
                  setTimeout(() => {
                    const canvasCheck = document.getElementById('three-js-canvas');
                    console.log('Canvas check after re-append:', {
                      found: !!canvasCheck,
                      isConnected: canvasCheck?.isConnected,
                      parent: canvasCheck?.parentElement
                    });
                  }, 100);
                }
              } catch (e) {
                console.error('Error re-appending canvas:', e);
              }
            }, 0);
          }
        });
        
        // Observe the container for changes with a more thorough configuration
        observer.observe(container, { 
          childList: true,  // Watch for child additions/removals
          subtree: true,    // Watch all descendants
          attributes: true, // Watch for attribute changes
        });
      } catch (e) {
        console.error("ThreeScene: Error creating WebGL renderer:", e);
        onError("Error creating WebGL renderer");
        return null;
      }
    }
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // Increased intensity
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // Increased intensity
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);
    
    const pointLight = new THREE.PointLight(0xffffcc, 1.0, 50); // Increased intensity and range
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);
    
    // Draw a simple, large, very visible sphere to test rendering
    const geometry = new THREE.SphereGeometry(8, 32, 32); // Larger size for visibility
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x00ffff,  // Bright cyan color for contrast on red
      emissive: 0x222222, // Add some emission for visibility
      metalness: 0.8,   // More metallic for visibility
      roughness: 0.2    // More shiny for visibility
    });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
    
    console.log('DEBUG RENDERING: Test sphere added to scene (CYAN)');
    
    // Render once immediately to test
    try {
      console.log('DEBUG RENDERING: Attempting initial render');
      renderer.render(scene, camera);
      console.log('DEBUG RENDERING: Initial render completed successfully');
    } catch (e) {
      console.error('DEBUG RENDERING: Initial render failed:', e);
      onError("Initial render failed");
    }
    
    return { scene, camera, renderer };
  } catch (error) {
    console.error("ThreeScene: Error initializing 3D scene:", error);
    onError("Error initializing 3D scene");
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
