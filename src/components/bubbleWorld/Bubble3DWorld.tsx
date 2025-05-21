
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useCameraControls } from '@/hooks/useCameraControls';
import { useBubbleInteraction } from '@/hooks/useBubbleInteraction';
import { BubbleData } from '@/types/bubble';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { initializeThreeScene, cleanupThreeScene } from '@/utils/threeSceneUtils';
import { useBubbleManager } from './BubbleManager';
import BubbleWorldStatus from './BubbleWorldStatus';
import BubbleWorldInstructions from './BubbleWorldInstructions';
import { useWorldInteraction } from './BubbleWorldInteraction';
import ComponentErrorBoundary from '../errorHandling/ComponentErrorBoundary';

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
  const animationFrameRef = useRef<number | null>(null);
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
  
  const { updateBubbles, animateBubbles } = useBubbleManager(sceneRef, bubbleRefsRef);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [is3DReady, setIs3DReady] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Setup world interaction handlers
  const { 
    setupEventListeners, 
    setupClickHandler,
    setupResizeHandler 
  } = useWorldInteraction({
    containerRef,
    cameraRef,
    sceneRef,
    rendererRef,
    bubbleRefsRef,
    isInteractingRef,
    handleReflect,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handlePinchZoom,
    mouseRef,
    onBubbleClick
  });
  
  // Define retry initialization function
  const handleRetry = useCallback(() => {
    setInitializationError(null);
    setIs3DReady(false);
    setIsInitialized(false);
    setRetryCount(prev => prev + 1);
    
    // Clean up previous Three.js scene if it exists
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    cleanupThreeScene(containerRef.current, rendererRef.current, bubbleRefsRef.current);
    
    // Force browser to skip a frame to ensure cleanup completes
    setTimeout(() => {
      toast({
        title: "Retrying 3D initialization",
        description: "Attempting to reload 3D environment..."
      });
    }, 100);
  }, [toast]);
  
  // Set up the 3D scene
  useEffect(() => {
    if (!containerRef.current || isInitialized) return;
    
    try {
      console.log(`Initializing 3D bubble world with ${bubbles.length} bubbles (attempt: ${retryCount + 1})`);
      
      // Initialize scene, camera, and renderer
      const threeElements = initializeThreeScene(
        containerRef.current, 
        (error) => setInitializationError(error)
      );
      
      if (!threeElements) {
        throw new Error("Failed to initialize Three.js scene");
      }
      
      const { scene, camera, renderer } = threeElements;
      sceneRef.current = scene;
      cameraRef.current = camera;
      rendererRef.current = renderer;
      
      // Setup animation loop
      const animate = () => {
        try {
          if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
          
          animationFrameRef.current = requestAnimationFrame(animate);
          
          // Update camera position based on controls
          updateCamera(cameraRef.current);
          
          // Animate bubbles
          animateBubbles();
          
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
    } catch (error) {
      console.error("Error initializing 3D bubble world:", error);
      setInitializationError("Failed to initialize 3D world");
      toast({
        title: "3D Rendering Failed",
        description: "There was an error initializing the 3D environment. Please refresh and try again.",
        variant: "destructive"
      });
    }

    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      cleanupThreeScene(containerRef.current, rendererRef.current, bubbleRefsRef.current);
    };
  }, [
    isInitialized, mouseRef, bubbles.length, toast, updateCamera, animateBubbles, retryCount
  ]);
  
  // Set up event listeners
  useEffect(() => {
    if (!containerRef.current || !isInitialized) return;
    
    const removeEventListeners = setupEventListeners();
    const removeClickHandler = setupClickHandler();
    const removeResizeHandler = setupResizeHandler();
    
    // Cleanup function
    return () => {
      if (removeEventListeners) removeEventListeners();
      if (removeClickHandler) removeClickHandler();
      if (removeResizeHandler) removeResizeHandler();
    };
  }, [isInitialized, setupEventListeners, setupClickHandler, setupResizeHandler]);
  
  // Update bubbles when the bubbles prop changes
  useEffect(() => {
    if (!sceneRef.current || !is3DReady || !bubbles || !Array.isArray(bubbles)) {
      return;
    }
    
    updateBubbles(bubbles);
  }, [bubbles, is3DReady, updateBubbles]);

  return (
    <ComponentErrorBoundary name="3D Bubble World">
      <motion.div 
        ref={containerRef} 
        className="w-full h-full relative overflow-hidden rounded-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <BubbleWorldStatus 
          is3DReady={is3DReady} 
          initializationError={initializationError} 
          onRetry={handleRetry}
        />
        <BubbleWorldInstructions is3DReady={is3DReady} />
      </motion.div>
    </ComponentErrorBoundary>
  );
};

export default Bubble3DWorld;
