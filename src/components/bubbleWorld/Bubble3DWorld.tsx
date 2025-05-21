
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useCameraControls } from '@/hooks/useCameraControls';
import { useBubbleInteraction } from '@/hooks/useBubbleInteraction';
import { BubbleData } from '@/types/bubble';
import { createBubbleGeometry, createBubbleMaterial, createTextCanvas } from '@/utils/bubbleUtils';
import { motion } from 'framer-motion';

interface Bubble3DWorldProps {
  bubbles: BubbleData[];
  onBubbleClick: (id: string) => void;
}

const Bubble3DWorld: React.FC<Bubble3DWorldProps> = ({ bubbles, onBubbleClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const bubbleRefsRef = useRef<{ [key: string]: THREE.Group }>({});
  
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
  
  // Set up the 3D scene
  useEffect(() => {
    if (!containerRef.current || isInitialized) return;
    
    try {
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
      
      // Create renderer
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true
      });
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      renderer.setClearColor(0x000000, 0); // Transparent background
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;
      
      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(10, 10, 10);
      scene.add(directionalLight);
      
      const pointLight = new THREE.PointLight(0xffffcc, 0.8, 30);
      pointLight.position.set(0, 0, 0);
      scene.add(pointLight);
      
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
      
      // Animation loop
      const animate = () => {
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
      };
      
      // Start animation
      animate();
      
      // Cleanup function
      return () => {
        if (containerRef.current && rendererRef.current) {
          containerRef.current.removeChild(rendererRef.current.domElement);
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
      return;
    }
    
    setIsInitialized(true);
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleWheel, handlePinchZoom, updateCamera, isInitialized, mouseRef]);
  
  // Update bubbles when the bubbles prop changes
  useEffect(() => {
    if (!sceneRef.current || !bubbles || !Array.isArray(bubbles)) return;
    
    try {
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
        
        // Create bubble mesh
        const geometry = createBubbleGeometry(size);
        const material = createBubbleMaterial();
        const bubbleMesh = new THREE.Mesh(geometry, material);
        
        // Create text label
        const textCanvas = createTextCanvas(bubble.topic, 36);
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
        
        // Set position
        const { x, y, z } = points[index] || { x: 0, y: 0, z: 0 };
        group.position.set(x, y, z);
        
        // Add userData for interaction
        group.userData = { 
          id: bubble.id,
          topic: bubble.topic,
          reflectCount: bubble.reflect_count || 0
        };
        
        // Add to scene
        scene.add(group);
        bubbleRefsRef.current[bubble.id] = group;
      });
    } catch (error) {
      console.error("Error updating bubbles:", error);
    }
  }, [bubbles]);
  
  // Handle clicks on bubbles
  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
    
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
            }
          }
        }
      }
    };
    
    containerRef.current?.addEventListener('click', handleClick);
    
    return () => {
      containerRef.current?.removeEventListener('click', handleClick);
    };
  }, [onBubbleClick, handleReflect, isInteractingRef]);
  
  // Generate points evenly distributed on a sphere
  const generatePointsOnSphere = (count: number, radius: number) => {
    const points = [];
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle
    
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2; // y goes from 1 to -1
      const radiusAtY = Math.sqrt(1 - y * y); // radius at y
      
      const theta = phi * i; // Golden angle increment
      
      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;
      
      points.push({
        x: x * radius,
        y: y * radius,
        z: z * radius
      });
    }
    
    return points;
  };

  return (
    <motion.div 
      ref={containerRef} 
      className="w-full h-full relative overflow-hidden rounded-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Optional UI overlays can go here */}
      <div className="absolute bottom-4 left-4 text-xs text-white/70 bg-black/30 px-2 py-1 rounded-md backdrop-blur-sm">
        <p>Hold Alt/Option + Click to reflect a bubble</p>
      </div>
    </motion.div>
  );
};

export default Bubble3DWorld;
