
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import BubbleDisplay from './BubbleDisplay';
import BubbleActions from './BubbleActions';
import BubbleDetails from './BubbleDetails';
import { BubbleAnimateProps, InteractionState } from './types';

const BubbleAnimate = ({ topics, onBubbleClick }: BubbleAnimateProps) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const bubblesRef = useRef<{ [key: string]: THREE.Group }>({});
  const particlesRef = useRef<{ [key: string]: THREE.Points }>({});
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const animationFrameRef = useRef<number>();
  const centralWorldRef = useRef<THREE.Mesh | null>(null);
  const timeRef = useRef(0);
  
  console.log("BubbleAnimate rendering with topics:", topics ? topics.length : 0);
  
  // Interaction state
  const interactionRef = useRef<InteractionState>({
    isInteracting: false,
    lastX: 0,
    lastY: 0,
    rotationSpeed: { x: 0, y: 0 },
    momentum: { x: 0, y: 0 },
    zoom: {
      current: 12,
      target: 12,
      min: 3,
      max: 25
    },
    pinchDistance: 0,
    lastPinchTime: 0,
    isDragging: false,
    startX: 0,
    startY: 0,
    moveThreshold: 5
  });

  // Initialize scene and camera
  useEffect(() => {
    if (!containerRef.current || isInitialized) return;
    
    console.log("Initializing Three.js scene and camera");
    
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const isMobile = width < 768;
    
    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Create camera with improved field of view
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
    camera.position.z = isMobile ? 8 : 10;
    camera.position.y = 1; // Slightly above center for better perspective
    interactionRef.current.zoom.current = camera.position.z;
    interactionRef.current.zoom.target = camera.position.z;
    cameraRef.current = camera;
    
    setIsInitialized(true);
    
    return () => {
      // Cleanup everything in the scene to prevent memory leaks
      if (sceneRef.current) {
        while(sceneRef.current.children.length > 0) { 
          const object = sceneRef.current.children[0];
          
          if (object instanceof THREE.Mesh) {
            if (object.geometry) object.geometry.dispose();
            
            if (object.material) {
              const materials = Array.isArray(object.material) 
                ? object.material 
                : [object.material];
                
              materials.forEach(material => {
                // Dispose textures
                for (const key in material) {
                  if (material[key] && material[key].isTexture) {
                    material[key].dispose();
                  }
                }
                material.dispose();
              });
            }
          }
          
          sceneRef.current.remove(object);
        }
      }
      
      bubblesRef.current = {};
      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, [isInitialized]);

  // Initialize renderer and world components
  useEffect(() => {
    if (!isInitialized || !containerRef.current || !sceneRef.current || !cameraRef.current) return;
    
    console.log("Initializing Three.js renderer and world components");
    
    const container = containerRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const isMobile = container.clientWidth < 768;
    
    // Set up display (renderer and central world)
    const { renderer, centralWorld } = BubbleDisplay({ 
      container, 
      scene, 
      camera, 
      interactionRef,
      isMobile
    });
    
    centralWorldRef.current = centralWorld;
    
    // Set up user interactions
    const { setupInteractionHandlers } = BubbleActions({
      container,
      camera,
      raycasterRef,
      mouseRef,
      interactionRef,
      bubblesRef,
      centralWorldRef,
      onBubbleClick
    });
    
    const cleanup = setupInteractionHandlers();
    
    // Main animation loop
    const animate = () => {
      if (!renderer || !camera || !scene) return;
      
      animationFrameRef.current = requestAnimationFrame(animate);
      timeRef.current += 0.002;
      
      // Smooth camera zooming
      const zoom = interactionRef.current.zoom;
      const zoomLerpFactor = isMobile ? 0.15 : 0.1;
      zoom.current += (zoom.target - zoom.current) * zoomLerpFactor;
      camera.position.z = zoom.current;
      
      // Update bubble positions and appearances
      const { updateBubbles } = BubbleDetails({
        topics,
        scene,
        camera,
        centralWorld,
        bubblesRef,
        particlesRef,
        interactionRef,
        isMobile
      });
      
      updateBubbles(timeRef.current);
      
      // Apply gentle auto-rotation when not interacting
      if (!interactionRef.current.isInteracting && centralWorld) {
        centralWorld.rotation.y += 0.0003;
      }
      
      // Update tweens and render
      TWEEN.update();
      renderer.render(scene, camera);
    };
    
    // Start animation
    animate();
    
    // Cleanup
    return () => {
      cleanup();
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (renderer) {
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }
    };
  }, [isInitialized, topics, onBubbleClick]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full touch-none select-none"
      style={{ touchAction: 'none' }}
    />
  );
};

export default BubbleAnimate;
