
import { RefObject } from 'react';
import * as THREE from 'three';

interface UseWorldInteractionProps {
  containerRef: RefObject<HTMLDivElement>;
  cameraRef: RefObject<THREE.PerspectiveCamera | null>;
  sceneRef: RefObject<THREE.Scene | null>;
  rendererRef: RefObject<THREE.WebGLRenderer | null>;
  bubbleRefsRef: RefObject<{ [key: string]: THREE.Group }>;
  isInteractingRef: RefObject<boolean>;
  handleReflect: (bubbleId: string, bubbleRefs: { [key: string]: THREE.Group }) => void;
  handleMouseDown: (e: MouseEvent) => void;
  handleMouseMove: (e: MouseEvent) => void;
  handleMouseUp: () => void;
  handleWheel: (e: WheelEvent) => void;
  handlePinchZoom: (distance: number) => void;
  mouseRef: RefObject<any>;
  onBubbleClick: (id: string) => void;
}

export const useWorldInteraction = ({
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
}: UseWorldInteractionProps) => {
  
  // Setup mouse and touch event listeners for the container
  const setupEventListeners = () => {
    const container = containerRef.current;
    if (!container) return;
    
    // Mouse events
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
      if (mouseRef.current) {
        mouseRef.current.lastPinchDistance = 0;
      }
      handleMouseUp();
    });
    
    // Return cleanup function
    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('wheel', handleWheel);
    };
  };
  
  // Setup click handler for bubble interaction
  const setupClickHandler = () => {
    if (!containerRef.current) return;
    
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
          Object.values(bubbleRefsRef.current || {}).flatMap(group => group.children), 
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
              handleReflect(bubbleId, bubbleRefsRef.current || {});
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
    
    containerRef.current.addEventListener('click', handleClick);
    
    // Return a cleanup function to remove the event listener
    return () => {
      containerRef.current?.removeEventListener('click', handleClick);
    };
  };
  
  // Handle window resize
  const setupResizeHandler = () => {
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Return cleanup function
    return () => window.removeEventListener('resize', handleResize);
  };
  
  return {
    setupEventListeners,
    setupClickHandler,
    setupResizeHandler
  };
};
