
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { BubbleWorldProps } from '@/types/bubble';
import { 
  createBubbleGeometry, 
  createBubbleMaterial, 
  createTextCanvas,
  createCentralWorldGeometry,
  createCentralWorldMaterial,
  calculateOrbitPosition
} from '@/utils/bubbleUtils';

const BubbleWorld = ({ topics, onBubbleClick }: BubbleWorldProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bubblesRef = useRef<{ [key: string]: THREE.Group }>({});
  const sceneRef = useRef<THREE.Scene | null>(null);
  const animationFrameRef = useRef<number>();
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const centralWorldRef = useRef<THREE.Mesh | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const interactionRef = useRef({
    isInteracting: false,
    lastX: 0,
    lastY: 0,
    rotationSpeed: { x: 0, y: 0 },
    momentum: { x: 0, y: 0 },
    zoom: {
      current: 12,
      target: 12,
      min: 4, // Increased zoom range for mobile
      max: 25  // Increased max zoom for better close-up view
    },
    pinchDistance: 0,
    lastPinchTime: 0,
    isDragging: false,
    startX: 0,
    startY: 0,
    moveThreshold: 5 // Threshold to differentiate between click and drag
  });

  // Create default topics if none provided to prevent loading state
  const displayTopics = topics.length === 0 ? [
    {
      id: "default-1",
      topic: "Welcome",
      username: "system",
      name: "Hello World",
      size: "lg" as "lg",
      reflect_count: 10,
      created_at: new Date().toISOString()
    },
    {
      id: "default-2",
      topic: "Getting Started",
      username: "system",
      name: "Welcome Tour",
      size: "md" as "md",
      reflect_count: 5,
      created_at: new Date().toISOString()
    }
  ] : topics;

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color('#F6F6F7'); // Light grey background to match the grey world

    const width = container.clientWidth;
    const height = container.clientHeight;
    const isMobile = width < 768;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = isMobile ? 9 : 12;
    interactionRef.current.zoom.current = camera.position.z;
    interactionRef.current.zoom.target = camera.position.z;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Enhanced lighting for smooth grey surface
    const ambientLight = new THREE.AmbientLight('#FFFFFF', 1.0);
    scene.add(ambientLight);

    // Add hemispheric light for better 3D depth
    const hemisphereLight = new THREE.HemisphereLight('#FFFFFF', '#BBBBBB', 1.0);
    scene.add(hemisphereLight);

    // Main directional light
    const mainLight = new THREE.DirectionalLight('#FFFFFF', 1.5);
    mainLight.position.set(3, 5, 5);
    scene.add(mainLight);

    // Secondary light for better highlights
    const secondaryLight = new THREE.DirectionalLight('#FFFFFF', 0.8);
    secondaryLight.position.set(-5, -3, -5);
    scene.add(secondaryLight);

    // Create central world (now a smooth grey sphere)
    const worldGeometry = createCentralWorldGeometry();
    const worldMaterial = createCentralWorldMaterial();
    const centralWorld = new THREE.Mesh(worldGeometry, worldMaterial);
    centralWorldRef.current = centralWorld;
    scene.add(centralWorld);

    // Create bubbles with orbital movement
    displayTopics.forEach((topic, index) => {
      const bubbleGroup = new THREE.Group();
      
      const baseSize = topic.size === 'lg' ? 0.8 : 
                      topic.size === 'md' ? 0.6 : 0.4;
      const reflectScale = 1 + (topic.reflect_count * 0.1);
      const finalSize = baseSize * reflectScale;
      
      // Create bubble
      const geometry = createBubbleGeometry(finalSize);
      const material = createBubbleMaterial();
      const bubble = new THREE.Mesh(geometry, material);
      bubbleGroup.add(bubble);

      // Store original size in userData for zoom scaling
      bubbleGroup.userData = {
        id: topic.id,
        orbitIndex: index,
        originalScale: finalSize,
        textScales: {
          nameScale: finalSize * 1.4,
          topicScale: finalSize * 1.2,
          reflectScale: finalSize
        }
      };

      // Create text labels that will appear inside the bubble
      // Use smaller font sizes for inside-bubble text
      const createLabelSprite = (text: string, position: THREE.Vector3, fontSize: number) => {
        const canvas = createTextCanvas(text, fontSize);
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        const spriteMaterial = new THREE.SpriteMaterial({ 
          map: texture,
          transparent: true,
          depthTest: false // Ensures text is visible inside bubble
        });
        
        const sprite = new THREE.Sprite(spriteMaterial);
        
        // Scale based on bubble size
        sprite.scale.set(
          finalSize * 1.4, 
          finalSize * 0.7, 
          1
        );
        
        sprite.position.copy(position);
        return sprite;
      };

      // Add text positioned within the bubble
      // Texts are positioned with Y-offsets to stack them inside the bubble
      bubbleGroup.add(createLabelSprite(
        topic.name, 
        new THREE.Vector3(0, finalSize * 0.2, 0), 
        isMobile ? 32 : 40
      ));
      
      bubbleGroup.add(createLabelSprite(
        topic.topic, 
        new THREE.Vector3(0, -finalSize * 0.2, 0), 
        isMobile ? 26 : 30
      ));
      
      bubbleGroup.add(createLabelSprite(
        `⭐ ${topic.reflect_count}`, 
        new THREE.Vector3(0, -finalSize * 0.6, 0), 
        isMobile ? 22 : 26
      ));

      // Set initial position
      const position = calculateOrbitPosition(index, displayTopics.length, 0);
      bubbleGroup.position.set(position.x, position.y, position.z);
      
      bubblesRef.current[topic.id] = bubbleGroup;
      scene.add(bubbleGroup);
    });

    // Improved pinch zoom for mobile with better sensitivity
    let initialPinchDistance = 0;
    
    const getPinchDistance = (e: TouchEvent) => {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      return Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );
    };

    // Enhanced touch events with better pinch detection and smoother zooming
    container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        initialPinchDistance = getPinchDistance(e);
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
    }, { passive: false });

    container.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const currentTime = Date.now();
        const timeDelta = currentTime - interactionRef.current.lastPinchTime;
        interactionRef.current.lastPinchTime = currentTime;
        
        // Only process the pinch if we're not throttling
        if (timeDelta > 16) { // ~60fps
          const currentDistance = getPinchDistance(e);
          // Calculate delta with improved sensitivity for mobile
          let delta = (currentDistance - interactionRef.current.pinchDistance) * (isMobile ? 0.015 : 0.01);
          
          // Apply non-linear scaling for better zoom control
          delta = Math.sign(delta) * Math.pow(Math.abs(delta), 0.8);
          
          interactionRef.current.zoom.target = Math.max(
            interactionRef.current.zoom.min,
            Math.min(interactionRef.current.zoom.max,
              interactionRef.current.zoom.target - delta
            )
          );
          interactionRef.current.pinchDistance = currentDistance;
        }
      } else if (e.touches.length === 1 && interactionRef.current.isInteracting) {
        e.preventDefault();
        const touch = e.touches[0];
        
        // Check if we've moved beyond the threshold to consider this a drag
        const deltaX = Math.abs(touch.clientX - interactionRef.current.startX);
        const deltaY = Math.abs(touch.clientY - interactionRef.current.startY);
        
        if (deltaX > interactionRef.current.moveThreshold || 
            deltaY > interactionRef.current.moveThreshold) {
          interactionRef.current.isDragging = true;
        }
        
        // Apply rotation if we're dragging
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
    }, { passive: false });

    // Handle bubble clicks with improved touch detection
    const handleBubbleClick = (event: MouseEvent | TouchEvent) => {
      // Skip if we were dragging
      if (interactionRef.current.isDragging) {
        return;
      }
      
      const rect = container.getBoundingClientRect();
      let clientX: number;
      let clientY: number;

      if (event instanceof MouseEvent) {
        clientX = event.clientX;
        clientY = event.clientY;
      } else {
        // TouchEvent - correctly access coordinates from changedTouches
        const touch = event.changedTouches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
      }

      const x = (clientX - rect.left) / rect.width * 2 - 1;
      const y = -(clientY - rect.top) / rect.height * 2 + 1;

      mouseRef.current.set(x, y);
      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      // Get all bubble meshes for intersection testing
      const bubbleMeshes = Object.values(bubblesRef.current).map(group => group.children[0]);
      const intersects = raycasterRef.current.intersectObjects(bubbleMeshes, true);

      if (intersects.length > 0) {
        const bubbleObject = intersects[0].object;
        // Navigate up to find the parent group that has the bubble ID
        let parent = bubbleObject.parent;
        while (parent && (!parent.userData || !parent.userData.id)) {
          parent = parent.parent;
        }
        
        if (parent && parent.userData && parent.userData.id) {
          // Visual feedback - scale bubble slightly
          const originalScale = { value: 1 };
          const targetScale = { value: 1.2 };
          
          new TWEEN.Tween(originalScale)
            .to(targetScale, 150)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onUpdate(() => {
              bubbleObject.scale.set(
                originalScale.value,
                originalScale.value,
                originalScale.value
              );
            })
            .chain(
              new TWEEN.Tween(targetScale)
                .to({ value: 1 }, 150)
                .easing(TWEEN.Easing.Quadratic.In)
                .onUpdate(() => {
                  bubbleObject.scale.set(
                    targetScale.value,
                    targetScale.value,
                    targetScale.value
                  );
                })
            )
            .start();
          
          // Call the click handler with the bubble ID
          onBubbleClick(parent.userData.id);
        }
      }
    };

    // Improved touchend handler with better click detection
    container.addEventListener('touchend', (e) => {
      if (interactionRef.current.isInteracting) {
        const wasDragging = interactionRef.current.isDragging;
        interactionRef.current.isInteracting = false;
        
        // Only handle as a click if we didn't drag much
        if (!wasDragging) {
          handleBubbleClick(e);
        }
        
        // Apply momentum for smooth deceleration after dragging
        if (wasDragging && centralWorldRef.current) {
          const decay = 0.95;
          const applyMomentum = () => {
            if (!centralWorldRef.current) return;
            
            const momentum = interactionRef.current.momentum;
            if (Math.abs(momentum.x) > 0.0001 || Math.abs(momentum.y) > 0.0001) {
              centralWorldRef.current.rotation.y += momentum.x;
              centralWorldRef.current.rotation.x += momentum.y;
              momentum.x *= decay;
              momentum.y *= decay;
              requestAnimationFrame(applyMomentum);
            }
          };
          
          applyMomentum();
        }
      }
    }, { passive: false });

    // Mouse wheel zoom with improved sensitivity and smoother behavior
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoom = interactionRef.current.zoom;
      // Non-linear scaling for smoother zoom at different distances
      const zoomSensitivity = 0.005 * (zoom.current / zoom.min);
      const delta = e.deltaY * zoomSensitivity;
      
      zoom.target = Math.max(zoom.min, Math.min(zoom.max, zoom.target + delta));
    };

    // Unified interaction handling for both mouse and touch with full range rotation
    const startInteraction = (clientX: number, clientY: number) => {
      interactionRef.current.isInteracting = true;
      interactionRef.current.lastX = clientX;
      interactionRef.current.lastY = clientY;
      interactionRef.current.isDragging = false;
      interactionRef.current.startX = clientX;
      interactionRef.current.startY = clientY;
    };

    const moveInteraction = (clientX: number, clientY: number) => {
      if (!interactionRef.current.isInteracting || !centralWorldRef.current) return;

      // Check if we've moved beyond the threshold to consider this a drag
      const deltaX = Math.abs(clientX - interactionRef.current.startX);
      const deltaY = Math.abs(clientY - interactionRef.current.startY);
      
      if (deltaX > interactionRef.current.moveThreshold || 
          deltaY > interactionRef.current.moveThreshold) {
        interactionRef.current.isDragging = true;
      }
      
      // Only apply rotation if we're now considered to be dragging
      if (interactionRef.current.isDragging) {
        // Adjust sensitivity based on device type
        const sensitivity = isMobile ? 0.015 : 0.01;
        const dx = clientX - interactionRef.current.lastX;
        const dy = clientY - interactionRef.current.lastY;

        centralWorldRef.current.rotation.y += dx * sensitivity;
        centralWorldRef.current.rotation.x += dy * sensitivity;

        // Store momentum for inertia
        interactionRef.current.momentum = {
          x: dx * sensitivity * 0.8,
          y: dy * sensitivity * 0.8
        };
      }

      interactionRef.current.lastX = clientX;
      interactionRef.current.lastY = clientY;
    };

    const endInteraction = (event?: MouseEvent) => {
      const wasDragging = interactionRef.current.isDragging;
      interactionRef.current.isInteracting = false;
      
      // Handle as click only if we didn't drag
      if (event && !wasDragging) {
        handleBubbleClick(event);
      }
      
      // Apply momentum after drag
      if (wasDragging && centralWorldRef.current) {
        const decay = 0.95;
        const applyMomentum = () => {
          if (!centralWorldRef.current) return;
          
          const momentum = interactionRef.current.momentum;
          if (Math.abs(momentum.x) > 0.0001 || Math.abs(momentum.y) > 0.0001) {
            centralWorldRef.current.rotation.y += momentum.x;
            centralWorldRef.current.rotation.x += momentum.y;
            momentum.x *= decay;
            momentum.y *= decay;
            requestAnimationFrame(applyMomentum);
          }
        };
        
        applyMomentum();
      }
    };

    // Mouse events
    container.addEventListener('mousedown', (e) => {
      startInteraction(e.clientX, e.clientY);
    });

    container.addEventListener('mousemove', (e) => {
      moveInteraction(e.clientX, e.clientY);
    });

    container.addEventListener('mouseup', (e) => {
      endInteraction(e);
    });

    container.addEventListener('mouseleave', () => {
      endInteraction();
    });

    container.addEventListener('wheel', handleWheel, { passive: false });

    // Animation loop with improved bubble scaling and movement
    let time = 0;
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      time += 0.002;
      
      // Update zoom with adaptive smoothing - faster on mobile for better responsiveness
      const zoom = interactionRef.current.zoom;
      const zoomLerpFactor = isMobile ? 0.15 : 0.1;
      zoom.current += (zoom.target - zoom.current) * zoomLerpFactor;
      if (camera) {
        camera.position.z = zoom.current;
      }

      // Calculate zoom scaling factor for bubbles with improved curve
      // Use a non-linear scale factor for more natural zooming feel
      const zoomRange = interactionRef.current.zoom.max - interactionRef.current.zoom.min;
      const normalizedZoom = (interactionRef.current.zoom.max - zoom.current) / zoomRange;
      const zoomFactor = 1 + Math.pow(normalizedZoom, 1.2); // Non-linear scaling
      
      // Update bubbles position and scale based on zoom
      Object.values(bubblesRef.current).forEach(bubble => {
        const index = bubble.userData.orbitIndex;
        const pos = calculateOrbitPosition(index, Object.keys(bubblesRef.current).length, time);
        
        const rotationOffset = new THREE.Euler(
          centralWorld.rotation.x,
          centralWorld.rotation.y,
          centralWorld.rotation.z
        );
        const rotatedPosition = new THREE.Vector3(pos.x, pos.y, pos.z)
          .applyEuler(rotationOffset);
        
        bubble.position.copy(rotatedPosition);
        
        // Face bubbles toward camera
        bubble.quaternion.copy(camera.quaternion);
        
        // Scale the bubble and text based on zoom level
        const origScale = bubble.userData.originalScale;
        const bubbleMesh = bubble.children[0] as THREE.Mesh;
        
        // Apply scale to bubble (first child is the bubble mesh)
        const scaleFactor = origScale * zoomFactor;
        bubbleMesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
        
        // Scale text sprites (children 1-3 are text)
        for (let i = 1; i < bubble.children.length; i++) {
          const sprite = bubble.children[i] as THREE.Sprite;
          const textScales = bubble.userData.textScales;
          const textScaleFactor = zoomFactor * 0.8; // slightly less aggressive scaling for text
          
          // Scale based on which text element it is and update positions
          let baseScale;
          if (i === 1) { // Name (top)
            baseScale = textScales.nameScale;
            sprite.position.set(0, scaleFactor * 0.2, 0);
          } else if (i === 2) { // Topic (middle)
            baseScale = textScales.topicScale;
            sprite.position.set(0, -scaleFactor * 0.2, 0);
          } else { // Reflect count (bottom)
            baseScale = textScales.reflectScale;
            sprite.position.set(0, -scaleFactor * 0.6, 0);
          }
          
          sprite.scale.set(
            baseScale * textScaleFactor,
            baseScale * textScaleFactor * 0.5,
            1
          );
        }
      });

      // Apply gentle auto-rotation when not interacting
      if (!interactionRef.current.isInteracting) {
        centralWorld.rotation.y += 0.0003; // Slower rotation for a more contemplative feel
      }

      TWEEN.update();
      renderer.render(scene, camera);
    };

    animate();

    // Improved window resize handling with debounce
    let resizeTimeout: number;
    const handleResize = () => {
      if (resizeTimeout) {
        window.clearTimeout(resizeTimeout);
      }

      resizeTimeout = window.setTimeout(() => {
        if (!container || !camera || !renderer) return;
        
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        // Update is-mobile detection on resize
        const isMobile = width < 768;
        
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }, 100); // Debounce resize events
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('wheel', handleWheel);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [onBubbleClick]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full touch-none select-none"
      style={{ touchAction: 'none' }}
    />
  );
};

export default BubbleWorld;
