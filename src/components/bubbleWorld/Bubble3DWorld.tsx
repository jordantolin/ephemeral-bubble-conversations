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
  const [lastBubbleCount, setLastBubbleCount] = useState(0);
  
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
    console.log('Bubble3DWorld: Ritento inizializzazione');
    
    setInitializationError(null);
    setIs3DReady(false);
    setIsInitialized(false);
    setRetryCount(prev => prev + 1);
    
    // Clean up previous Three.js scene if it exists
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    cleanupThreeScene(containerRef.current, rendererRef.current, bubbleRefsRef.current);
    
    setTimeout(() => {
      toast({
        title: "Ritento inizializzazione 3D",
        description: "Tentativo di ricaricare l'ambiente 3D..."
      });
    }, 100);
  }, [toast]);
  
  // Ensure container visibility on mount
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    
    // Force container to be visible with explicit inline styles
    container.style.display = 'block';
    container.style.visibility = 'visible';
    container.style.opacity = '1';
    container.style.minHeight = '300px';
    container.style.minWidth = '300px';
    container.style.position = 'relative';
    
    // Force layout recalculation
    void container.offsetHeight;
  }, []);
  
  // Set up the 3D scene
  useEffect(() => {
    if (!containerRef.current || isInitialized) return;
    
    try {
      console.log(`Bubble3DWorld: Inizializzazione mondo bolle 3D con ${bubbles.length} bolle (tentativo: ${retryCount + 1})`);
      
      // Initialize scene, camera, and renderer
      const threeElements = initializeThreeScene(
        containerRef.current, 
        (error) => {
          console.error('Bubble3DWorld: Errore di inizializzazione:', error);
          setInitializationError(error);
        }
      );
      
      if (!threeElements) {
        throw new Error("Fallita inizializzazione scena Three.js");
      }
      
      const { scene, camera, renderer } = threeElements;
      sceneRef.current = scene;
      cameraRef.current = camera;
      rendererRef.current = renderer;
      
      // Verifica che il renderer sia correttamente collegato al DOM
      if (!renderer.domElement.isConnected) {
        console.error('Bubble3DWorld: Il canvas del renderer non è collegato al DOM!');
        setInitializationError("Canvas non collegato al DOM");
        throw new Error("Canvas non collegato al DOM");
      }
      
      console.log("Bubble3DWorld: Renderer inizializzato correttamente");
      
      // Setup animation loop
      const animate = () => {
        try {
          if (!sceneRef.current || !cameraRef.current || !rendererRef.current) {
            console.warn('Bubble3DWorld: Mancano elementi necessari per il rendering');
            return;
          }
          
          animationFrameRef.current = requestAnimationFrame(animate);
          
          // Update camera position based on controls
          updateCamera(cameraRef.current);
          
          // Animate bubbles - IMPORTANT: This is what makes bubbles move!
          animateBubbles();
          
          // Render the scene
          try {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
          } catch (renderError) {
            console.error('Bubble3DWorld: Errore durante il rendering:', renderError);
          }
        } catch (error) {
          console.error("Bubble3DWorld: Errore nel loop di animazione:", error);
        }
      };
      
      // Start animation loop immediately
      animate();
      
      setIsInitialized(true);
      setIs3DReady(true);
      console.log("Bubble3DWorld: Inizializzazione mondo 3D completata");
      
      // Update bubbles immediately
      if (bubbles.length > 0) {
        updateBubbles(bubbles);
        setLastBubbleCount(bubbles.length);
      }
      
    } catch (error) {
      console.error("Bubble3DWorld: Errore inizializzazione mondo bolle 3D:", error);
      setInitializationError("Errore inizializzazione mondo 3D");
      toast({
        title: "Rendering 3D fallito",
        description: "Si è verificato un errore nell'inizializzazione dell'ambiente 3D. Ricarica la pagina o prova con un altro browser.",
        variant: "destructive"
      });
    }

    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      cleanupThreeScene(containerRef.current, rendererRef.current, bubbleRefsRef.current);
    };
  }, [
    isInitialized, mouseRef, bubbles.length, toast, updateCamera, animateBubbles, retryCount, updateBubbles
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
    
    // Only update if bubbles have changed
    if (bubbles.length !== lastBubbleCount) {
      console.log(`Bubble3DWorld: Aggiorno bolle, totale: ${bubbles.length}`);
      updateBubbles(bubbles);
      setLastBubbleCount(bubbles.length);
    }
  }, [bubbles, is3DReady, updateBubbles, lastBubbleCount]);

  // Add console logs to help debug
  useEffect(() => {
    console.log(`Bubble3DWorld status: initialized=${isInitialized}, ready=${is3DReady}, error=${initializationError}`);
    
    // Check if container is visible
    if (containerRef.current) {
      const style = window.getComputedStyle(containerRef.current);
      console.log(`Container visibility: display=${style.display}, visibility=${style.visibility}, height=${style.height}`);
    }
  }, [isInitialized, is3DReady, initializationError]);

  // Log container info and visibility periodically
  useEffect(() => {
    if (!containerRef.current || !is3DReady) return;
    
    const checkVisibility = () => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const isInViewport = (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
      );
      
      console.log('Bubble3DWorld container visibility check:', {
        rect,
        isInViewport,
        style: {
          display: window.getComputedStyle(containerRef.current).display,
          visibility: window.getComputedStyle(containerRef.current).visibility,
          opacity: window.getComputedStyle(containerRef.current).opacity
        }
      });
      
      // Check if canvas is present and visible
      const canvas = containerRef.current.querySelector('canvas');
      if (canvas) {
        console.log('Bubble3DWorld canvas check:', {
          isConnected: canvas.isConnected,
          width: canvas.width,
          height: canvas.height,
          style: {
            width: canvas.style.width,
            height: canvas.style.height,
            display: window.getComputedStyle(canvas).display,
            visibility: window.getComputedStyle(canvas).visibility
          }
        });
      } else {
        console.warn('Bubble3DWorld: Canvas non trovato nel container!');
      }
    };
    
    // Check immediately
    checkVisibility();
    
    // Check periodically
    const intervalId = setInterval(checkVisibility, 5000);
    
    return () => clearInterval(intervalId);
  }, [containerRef.current, is3DReady]);

  return (
    <ComponentErrorBoundary name="3D Bubble World">
      <motion.div 
        ref={containerRef} 
        className="w-full h-full relative overflow-hidden rounded-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          minHeight: '300px',
          minWidth: '300px',
          display: 'block',
          visibility: 'visible',
          position: 'relative',
          overflow: 'hidden'
        }}
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
