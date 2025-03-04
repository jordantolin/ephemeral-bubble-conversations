
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { BubbleClickHandler, InteractionState } from './types';

interface BubbleActionsProps {
  container: HTMLDivElement;
  camera: THREE.PerspectiveCamera;
  raycasterRef: React.MutableRefObject<THREE.Raycaster>;
  mouseRef: React.MutableRefObject<THREE.Vector2>;
  interactionRef: React.MutableRefObject<InteractionState>;
  bubblesRef: React.MutableRefObject<{ [key: string]: THREE.Group }>;
  centralWorldRef: React.MutableRefObject<THREE.Mesh | null>;
  onBubbleClick: BubbleClickHandler;
}

const BubbleActions = ({
  container,
  camera,
  raycasterRef,
  mouseRef,
  interactionRef,
  bubblesRef,
  centralWorldRef,
  onBubbleClick
}: BubbleActionsProps) => {
  const navigate = useNavigate();

  // Handle bubble clicks
  const handleBubbleClick = useCallback((event: MouseEvent | TouchEvent) => {
    if (interactionRef.current.isDragging) return;
    
    const rect = container.getBoundingClientRect();
    let clientX: number;
    let clientY: number;

    if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
      const touch = event.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    }

    const x = (clientX - rect.left) / rect.width * 2 - 1;
    const y = -(clientY - rect.top) / rect.height * 2 + 1;

    mouseRef.current.set(x, y);
    raycasterRef.current.setFromCamera(mouseRef.current, camera);

    const bubbleMeshes = Object.values(bubblesRef.current).map(group => group.children[0]);
    const intersects = raycasterRef.current.intersectObjects(bubbleMeshes, true);

    if (intersects.length > 0) {
      const bubbleObject = intersects[0].object;
      let parent = bubbleObject.parent;
      while (parent && (!parent.userData || !parent.userData.id)) {
        parent = parent.parent;
      }
      
      if (parent && parent.userData && parent.userData.id) {
        // Enhanced click animation with bounce effect
        const originalScale = { value: 1 };
        const targetScale = { value: 1.3 }; // More pronounced scaling
        
        new TWEEN.Tween(originalScale)
          .to(targetScale, 200)
          .easing(TWEEN.Easing.Bounce.Out) // Bounce effect
          .onUpdate(() => {
            if (!bubbleObject) return;
            bubbleObject.scale.set(
              originalScale.value,
              originalScale.value,
              originalScale.value
            );
          })
          .chain(
            new TWEEN.Tween(targetScale)
              .to({ value: 1 }, 200)
              .easing(TWEEN.Easing.Elastic.Out) // Elastic return
              .onUpdate(() => {
                if (!bubbleObject) return;
                bubbleObject.scale.set(
                  targetScale.value,
                  targetScale.value,
                  targetScale.value
                );
              })
          )
          .start();
        
        // Navigate directly to the BubbleChat page with state to indicate we came from bubbleWorld
        navigate(`/bubble-chat/${parent.userData.id}`, { state: { from: 'bubbleWorld' } });
        
        // Also call the provided onBubbleClick callback for external handling
        onBubbleClick(parent.userData.id);
      }
    }
  }, [container, camera, raycasterRef, mouseRef, bubblesRef, navigate, onBubbleClick, interactionRef]);

  // Setup interaction handlers
  const setupInteractionHandlers = useCallback(() => {
    // Touch event handlers
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const initialPinchDistance = Math.hypot(
          touch1.clientX - touch2.clientX,
          touch1.clientY - touch2.clientY
        );
        interactionRef.current.pinchDistance = initialPinchDistance;
        interactionRef.current.lastPinchTime = Date.now();
      } else if (e.touches.length === 1) {
        e.preventDefault();
        const touch = e.touches[0];
        interactionRef.current.lastX = touch.clientX;
        interactionRef.current.lastY = touch.clientY;
        interactionRef.current.isInteracting = true;
        interactionRef.current.isDragging = false;
        interactionRef.current.startX = touch.clientX;
        interactionRef.current.startY = touch.clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.hypot(
          touch1.clientX - touch2.clientX,
          touch1.clientY - touch2.clientY
        );
        const delta = (currentDistance - interactionRef.current.pinchDistance) * 0.01;
        interactionRef.current.zoom.target = Math.max(
          interactionRef.current.zoom.min,
          Math.min(interactionRef.current.zoom.max,
            interactionRef.current.zoom.target - delta
          )
        );
        interactionRef.current.pinchDistance = currentDistance;
      } else if (e.touches.length === 1 && interactionRef.current.isInteracting) {
        e.preventDefault();
        const touch = e.touches[0];
        
        const deltaX = Math.abs(touch.clientX - interactionRef.current.startX);
        const deltaY = Math.abs(touch.clientY - interactionRef.current.startY);
        
        if (deltaX > interactionRef.current.moveThreshold || 
            deltaY > interactionRef.current.moveThreshold) {
          interactionRef.current.isDragging = true;
        }
        
        if (interactionRef.current.isDragging && centralWorldRef.current) {
          const dx = touch.clientX - interactionRef.current.lastX;
          const dy = touch.clientY - interactionRef.current.lastY;
          
          centralWorldRef.current.rotation.y += dx * 0.01;
          centralWorldRef.current.rotation.x += dy * 0.01;
          
          interactionRef.current.momentum = {
            x: dx * 0.01 * 0.8,
            y: dy * 0.01 * 0.8
          };
        }
        
        interactionRef.current.lastX = touch.clientX;
        interactionRef.current.lastY = touch.clientY;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (interactionRef.current.isInteracting) {
        const wasDragging = interactionRef.current.isDragging;
        interactionRef.current.isInteracting = false;
        
        if (!wasDragging && e.changedTouches.length === 1) {
          handleBubbleClick(e);
        }
        
        if (wasDragging && centralWorldRef.current) {
          applyMomentum();
        }
      }
    };

    // Mouse event handlers
    const onMouseDown = (e: MouseEvent) => {
      interactionRef.current.isInteracting = true;
      interactionRef.current.lastX = e.clientX;
      interactionRef.current.lastY = e.clientY;
      interactionRef.current.isDragging = false;
      interactionRef.current.startX = e.clientX;
      interactionRef.current.startY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!interactionRef.current.isInteracting || !centralWorldRef.current) return;

      const deltaX = Math.abs(e.clientX - interactionRef.current.startX);
      const deltaY = Math.abs(e.clientY - interactionRef.current.startY);
      
      if (deltaX > interactionRef.current.moveThreshold || 
          deltaY > interactionRef.current.moveThreshold) {
        interactionRef.current.isDragging = true;
      }
      
      if (interactionRef.current.isDragging) {
        const dx = e.clientX - interactionRef.current.lastX;
        const dy = e.clientY - interactionRef.current.lastY;

        centralWorldRef.current.rotation.y += dx * 0.005;
        centralWorldRef.current.rotation.x += dy * 0.005;

        interactionRef.current.momentum = {
          x: dx * 0.005 * 0.8,
          y: dy * 0.005 * 0.8
        };
      }

      interactionRef.current.lastX = e.clientX;
      interactionRef.current.lastY = e.clientY;
    };

    const onMouseUp = (e: MouseEvent) => {
      const wasDragging = interactionRef.current.isDragging;
      interactionRef.current.isInteracting = false;

      if (!wasDragging) {
        handleBubbleClick(e);
      }

      if (wasDragging && centralWorldRef.current) {
        applyMomentum();
      }
    };

    const onMouseLeave = () => {
      interactionRef.current.isInteracting = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoom = interactionRef.current.zoom;
      const zoomSensitivity = 0.005 * (zoom.current / zoom.min);
      const delta = e.deltaY * zoomSensitivity;
      
      zoom.target = Math.max(zoom.min, Math.min(zoom.max, zoom.target + delta));
    };

    // Apply momentum after dragging ends
    const applyMomentum = () => {
      if (!centralWorldRef.current) return;
      
      const decay = 0.95;
      const applyStep = () => {
        if (!centralWorldRef.current) return;
        
        const momentum = interactionRef.current.momentum;
        if (Math.abs(momentum.x) > 0.0001 || Math.abs(momentum.y) > 0.0001) {
          centralWorldRef.current.rotation.y += momentum.x;
          centralWorldRef.current.rotation.x += momentum.y;
          momentum.x *= decay;
          momentum.y *= decay;
          requestAnimationFrame(applyStep);
        }
      };
      
      applyStep();
    };

    // Add event listeners
    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: false });
    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseup', onMouseUp);
    container.addEventListener('mouseleave', onMouseLeave);
    container.addEventListener('wheel', onWheel, { passive: false });

    // Return cleanup function
    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('mousedown', onMouseDown);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('mouseleave', onMouseLeave);
      container.removeEventListener('wheel', onWheel);
    };
  }, [container, centralWorldRef, handleBubbleClick, interactionRef]);

  return { setupInteractionHandlers };
};

export default BubbleActions;
