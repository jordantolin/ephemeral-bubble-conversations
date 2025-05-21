
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useCameraControls } from '@/hooks/useCameraControls';
import { useBubbleInteraction } from '@/hooks/useBubbleInteraction';
import { BubbleData } from '@/types/bubble';
import { createBubbleGeometry, createBubbleMaterial, createTextCanvas } from '@/utils/bubbleUtils';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

interface Bubble3DWorldProps {
  bubbles: BubbleData[];
  onBubbleClick: (id: string) => void;
}

// Sample positions for debugging when coordinate generation fails
const fallbackPositions = [
  { x: 5, y: 0, z: 0 },
  { x: -5, y: 0, z: 0 },
  { x: 0, y: 5, z: 0 },
  { x: 0, y: -5, z: 0 },
  { x: 0, y: 0, z: 5 },
  { x: 0, y: 0, z: -5 }
];

const Bubble3DWorld: React.FC<Bubble3DWorldProps> = ({ bubbles, onBubbleClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const bubbleRefsRef = useRef<{ [key: string]: THREE.Group }>({});
  const { toast } = useToast();
  
  const { 
    handleMouseDown, 
    handleMouseMove, 
    handleMouseUp, 
    handleWheel,
    handlePinchZoom, 
    updateCamera,
    mouseRef 
  } = useCameraControls();
  
  const { 
    isInteractingRef, 
    handleReflect 
  } = useBubbleInteraction();
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [is3DReady, setIs3DReady] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  
  // Set up the 3D scene
  useEffect(() => {
    if (!containerRef.current || isInitialized) return;
    
    try {
      console.log("Initializing 3D bubble world with", bubbles.length, "bubbles");
      
      // Create scene
      const scene = new THREE.Scene();
      sceneRef.current = scene;
      
      // Create camera
      const camera = new THREE.PerspectiveCamera(
        70,
        containerRef.current.clientWidth / containerRef.current.clientHeight,
        0.1,
        1000
      );
      camera.position.z = 15;
      cameraRef.current = camera;
      
      // Create renderer with error handling
      try {
        const renderer = new THREE.WebGLRenderer({ 
          antialias: true,
          alpha: true
        });
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        renderer.setClearColor(0x000000, 0); // Transparent background
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;
      } catch (e) {
        console.error("Failed to create WebGL renderer:", e);
        setInitializationError("WebGL renderer creation failed");
        throw e;
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
      
      // Add a helper grid for orientation (optional)
      const gridHelper = new THREE.GridHelper(20, 20, 0xffffff, 0xffffff);
      gridHelper.position.y = -10;
      scene.add(gridHelper);
      
      // Event listeners
      const container = containerRef.current;
      
      container.addEventListener('mousedown', handleMouseDown);
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseup', handleMouseUp);
      container.addEventListener('wheel', handleWheel);
      
      // Touch events for mobile
      container.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          // Single touch - treat as mouse down
          handleMouseDown({
            clientX: e.touches[0].clientX,
            clientY: e.touches[0].clientY
          } as MouseEvent);
        } else if (e.touches.length === 2) {
          // Pinch zoom
          const touch1 = e.touches[0];
          const touch2 = e.touches[1];
          const distance = Math.hypot(
            touch1.clientX - touch2.clientX,
            touch1.clientY - touch2.clientY
          );
          handlePinchZoom(distance);
        }
      });
      
      container.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
          // Single touch - treat as mouse move
          handleMouseMove({
            clientX: e.touches[0].clientX,
            clientY: e.touches[0].clientY
          } as MouseEvent);
        } else if (e.touches.length === 2) {
          // Pinch zoom
          const touch1 = e.touches[0];
          const touch2 = e.touches[1];
          const distance = Math.hypot(
            touch1.clientX - touch2.clientX,
            touch1.clientY - touch2.clientY
          );
          handlePinchZoom(distance);
        }
      });
      
      container.addEventListener('touchend', () => {
        mouseRef.current.lastPinchDistance = 0;
        handleMouseUp();
      });
      
      // Window resize handler
      const handleResize = () => {
        if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
        
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(width, height);
      };
      
      window.addEventListener('resize', handleResize);
      
      // Animation loop with error handling
      const animate = () => {
        try {
          if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
          
          requestAnimationFrame(animate);
          
          // Update camera position based on controls
          updateCamera(cameraRef.current);
          
          // Add subtle animation to all bubbles
          Object.values(bubbleRefsRef.current).forEach((bubbleGroup) => {
            bubbleGroup.rotation.y += 0.002;
            bubbleGroup.rotation.x += 0.001;
            
            // Small bobbing motion
            const time = Date.now() * 0.001;
            const floatY = Math.sin(time + bubbleGroup.position.x) * 0.05;
            bubbleGroup.position.y += floatY * 0.01;
          });
          
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        } catch (error) {
          console.error("Error in animation loop:", error);
          // Don't throw here - just log the error to avoid crashing the loop
        }
      };
      
      // Start animation
      animate();
      
      setIsInitialized(true);
      setIs3DReady(true);
      console.log("3D world initialization complete");
      
      // Cleanup function
      return () => {
        if (containerRef.current && rendererRef.current) {
          try {
            containerRef.current.removeChild(rendererRef.current.domElement);
          } catch (e) {
            console.error("Error removing renderer:", e);
          }
        }
        
        window.removeEventListener('resize', handleResize);
        
        if (containerRef.current) {
          containerRef.current.removeEventListener('mousedown', handleMouseDown);
          containerRef.current.removeEventListener('mousemove', handleMouseMove);
          containerRef.current.removeEventListener('mouseup', handleMouseUp);
          containerRef.current.removeEventListener('wheel', handleWheel);
        }
        
        // Dispose of 3D objects
        Object.values(bubbleRefsRef.current).forEach((group) => {
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
        
        if (rendererRef.current) {
          rendererRef.current.dispose();
        }
      };
    } catch (error) {
      console.error("Error initializing 3D bubble world:", error);
      setInitializationError("Failed to initialize 3D world");
      toast({
        title: "3D Rendering Failed",
        description: "There was an error initializing the 3D environment. Please refresh and try again.",
        variant: "destructive"
      });
      return;
    }
  }, [
    handleMouseDown, handleMouseMove, handleMouseUp, 
    handleWheel, handlePinchZoom, updateCamera, 
    isInitialized, mouseRef, bubbles.length, toast
  ]);
  
  // Update bubbles when the bubbles prop changes
  useEffect(() => {
    if (!sceneRef.current || !is3DReady || !bubbles || !Array.isArray(bubbles)) {
      return;
    }
    
    try {
      console.log("Updating bubbles in 3D world:", bubbles.length);
      
      const scene = sceneRef.current;
      const existingBubbleIds = Object.keys(bubbleRefsRef.current);
      const newBubbleIds = bubbles.map(bubble => bubble.id);
      
      // Remove bubbles that are no longer in the data
      existingBubbleIds.forEach(id => {
        if (!newBubbleIds.includes(id) && bubbleRefsRef.current[id]) {
          scene.remove(bubbleRefsRef.current[id]);
          delete bubbleRefsRef.current[id];
        }
      });
      
      // Calculate positions in a sphere formation
      const radius = Math.max(8, Math.min(15, bubbles.length * 0.8));
      const points = generatePointsOnSphere(bubbles.length, radius);
      
      // Add or update bubbles
      bubbles.forEach((bubble, index) => {
        // Skip if bubble already exists
        if (bubbleRefsRef.current[bubble.id]) {
          // Update existing bubble if needed
          return;
        }
        
        // Create new bubble
        const sizeMap = {
          'sm': 0.8,
          'md': 1.0,
          'lg': 1.2
        };
        const size = sizeMap[bubble.size] || 1.0;
        
        try {
          // Create bubble mesh
          const geometry = createBubbleGeometry(size);
          const material = createBubbleMaterial();
          const bubbleMesh = new THREE.Mesh(geometry, material);
          
          // Create text label
          const textCanvas = createTextCanvas(bubble.topic || "Untitled", 36);
          const textTexture = new THREE.CanvasTexture(textCanvas);
          const textMaterial = new THREE.SpriteMaterial({ 
            map: textTexture,
            transparent: true
          });
          const textSprite = new THREE.Sprite(textMaterial);
          textSprite.scale.set(3, 1.5, 1);
          textSprite.position.set(0, 0, size + 0.5);
          
          // Group bubble and text
          const group = new THREE.Group();
          group.add(bubbleMesh);
          group.add(textSprite);
          
          // Set position - use generated sphere points or fallback positions
          let position = points[index];
          if (!position) {
            // Use fallback position if sphere generation failed
            const fallbackIndex = index % fallbackPositions.length;
            position = fallbackPositions[fallbackIndex];
          }
          
          group.position.set(position.x, position.y, position.z);
          
          // Add userData for interaction
          group.userData = { 
            id: bubble.id,
            topic: bubble.topic,
            reflectCount: bubble.reflect_count || 0
          };
          
          // Add to scene
          scene.add(group);
          bubbleRefsRef.current[bubble.id] = group;
        } catch (e) {
          console.error(`Error creating bubble (${bubble.id}):`, e);
          // Continue with the next bubble
        }
      });
    } catch (error) {
      console.error("Error updating bubbles:", error);
    }
  }, [bubbles, is3DReady]);
  
  // Handle clicks on bubbles
  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current || !is3DReady) return;
    
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    const handleClick = (event: MouseEvent) => {
      if (isInteractingRef.current || !containerRef.current) return;
      
      // Calculate mouse position in normalized device coordinates
      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / containerRef.current.clientWidth) * 2 - 1;
      mouse.y = - ((event.clientY - rect.top) / containerRef.current.clientHeight) * 2 + 1;
      
      if (cameraRef.current && sceneRef.current) {
        // Update the picking ray with the camera and mouse position
        raycaster.setFromCamera(mouse, cameraRef.current);
        
        // Calculate objects intersecting the picking ray
        const intersects = raycaster.intersectObjects(
          Object.values(bubbleRefsRef.current).flatMap(group => group.children), 
          true
        );
        
        if (intersects.length > 0) {
          // Find the bubble group that was clicked
          let targetGroup: THREE.Group | null = null;
          let currentObj = intersects[0].object;
          
          while (currentObj.parent && !(currentObj instanceof THREE.Scene)) {
            if (currentObj instanceof THREE.Group && 'id' in currentObj.userData) {
              targetGroup = currentObj;
              break;
            }
            currentObj = currentObj.parent;
          }
          
          if (targetGroup && 'id' in targetGroup.userData) {
            const bubbleId = targetGroup.userData.id;
            
            // If Alt/Option key is pressed, reflect the bubble instead of clicking
            if (event.altKey) {
              handleReflect(bubbleId, bubbleRefsRef.current);
            } else {
              // Handle bubble click
              onBubbleClick(bubbleId);
              
              // Visual feedback when clicking
              if (targetGroup) {
                const originalScale = targetGroup.scale.clone();
                
                // Quick pulse animation
                targetGroup.scale.multiplyScalar(1.2);
                setTimeout(() => {
                  if (targetGroup) {
                    targetGroup.scale.copy(originalScale);
                  }
                }, 200);
              }
            }
          }
        }
      }
    };
    
    containerRef.current?.addEventListener('click', handleClick);
    
    return () => {
      containerRef.current?.removeEventListener('click', handleClick);
    };
  }, [onBubbleClick, handleReflect, isInteractingRef, is3DReady]);
  
  // Generate points evenly distributed on a sphere (improved algorithm)
  const generatePointsOnSphere = (count: number, radius: number) => {
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
      console.error("Error generating sphere points:", e);
      // Return fallback positions
      return fallbackPositions.map(p => ({
        x: p.x * radius / 5,
        y: p.y * radius / 5,
        z: p.z * radius / 5
      }));
    }
  };

  return (
    <motion.div 
      ref={containerRef} 
      className="w-full h-full relative overflow-hidden rounded-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Loading indicator */}
      {!is3DReady && !initializationError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10 backdrop-blur-sm">
          <div className="w-12 h-12 rounded-full border-4 border-t-yellow-400 border-yellow-200 animate-spin mb-3"></div>
          <p className="text-gray-700">Loading 3D environment...</p>
        </div>
      )}
      
      {/* Error message */}
      {initializationError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-100/80 backdrop-blur-sm p-6">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 011.414 0L10 8.586l1.293-1.293a1 1 0 111.414 1.414L11.414 10l1.293 1.293a1 1 0 01-1.414 1.414L10 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L8.586 10 7.293 8.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-red-800 mb-2">3D Rendering Failed</h3>
          <p className="text-center text-red-600 mb-4">{initializationError}</p>
          <button 
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      )}

      {/* User instructions overlay */}
      {is3DReady && (
        <div className="absolute bottom-4 left-4 text-xs bg-black/30 px-3 py-2 rounded-md backdrop-blur-sm text-white">
          <p className="mb-1">• Click and drag to rotate view</p>
          <p className="mb-1">• Scroll to zoom in/out</p>
          <p>• Hold Alt/Option + Click to reflect a bubble</p>
        </div>
      )}
    </motion.div>
  );
};

export default Bubble3DWorld;
