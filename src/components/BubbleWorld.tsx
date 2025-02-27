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
      min: 3, // Reduced minimum zoom for better mobile experience
      max: 20  // Reduced max zoom for more control on mobile
    },
    pinchDistance: 0,
    lastPinchTime: 0,
    isDragging: false,
    dragThreshold: 3, // Reduced drag threshold for more responsive touch on mobile
    startTime: 0,
    isMobile: false, // Track if we're on mobile
    touchId: null, // Track the primary touch ID for better multi-touch handling
    lastTapTime: 0 // For detecting double taps
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color('#F6F6F7'); // Light grey background to match the grey world

    const width = container.clientWidth;
    const height = container.clientHeight;
    const isMobile = width < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    interactionRef.current.isMobile = isMobile;

    const camera = new THREE.PerspectiveCamera(isMobile ? 70 : 60, width / height, 0.1, 1000);
    camera.position.z = isMobile ? 7 : 12; // Start closer on mobile
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

    // Create bubbles with smoother floating movement
    topics.forEach((topic, index) => {
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
        },
        // Improved floating movement with better parameters for smoother animation
        movement: {
          speed: 0.15 + Math.random() * 0.2,  // Slower, more controlled speed
          amplitude: {  // Different amplitudes for each axis
            x: 0.05 + Math.random() * 0.1,  
            y: 0.05 + Math.random() * 0.1,
            z: 0.05 + Math.random() * 0.1
          },  
          phase: {  // Different starting phases
            x: Math.random() * Math.PI * 2,  
            y: Math.random() * Math.PI * 2,
            z: Math.random() * Math.PI * 2
          },
          frequency: {  // Different frequencies for each axis
            x: 0.3 + Math.random() * 0.3,
            y: 0.3 + Math.random() * 0.3,
            z: 0.3 + Math.random() * 0.3
          },
          // Track original position for smoother animation
          originalPosition: calculateOrbitPosition(index, topics.length, Math.random() * Math.PI * 2)
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
      const position = calculateOrbitPosition(index, topics.length, Math.random() * Math.PI * 2);
      bubbleGroup.position.set(position.x, position.y, position.z);
      
      bubblesRef.current[topic.id] = bubbleGroup;
      scene.add(bubbleGroup);
    });

    // IMPROVED TOUCH CONTROLS FOR SMARTPHONES

    // Get pinch distance between two touches
    const getPinchDistance = (e: TouchEvent) => {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      return Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );
    };

    // Detect and track the primary touch ID for consistent multi-touch handling
    const getPrimaryTouchId = (e: TouchEvent): number | null => {
      if (e.touches.length === 0) return null;
      
      // If we already have a touchId and it's still present, keep using it
      if (interactionRef.current.touchId !== null) {
        for (let i = 0; i < e.touches.length; i++) {
          if (e.touches[i].identifier === interactionRef.current.touchId) {
            return interactionRef.current.touchId;
          }
        }
      }
      
      // Otherwise use the first touch
      return e.touches[0].identifier;
    };

    // Find a touch by ID
    const getTouchById = (e: TouchEvent, id: number | null): Touch | null => {
      if (id === null) return null;
      
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === id) {
          return e.touches[i];
        }
      }
      
      return null;
    };

    // Enhanced touchstart handler with better multi-touch support
    container.addEventListener('touchstart', (e) => {
      e.preventDefault(); // Prevent default behavior like scrolling
      
      // Handle double-tap to reset view
      const now = Date.now();
      if (e.touches.length === 1) {
        if (now - interactionRef.current.lastTapTime < 300) {
          // Double tap detected - reset view
          if (centralWorldRef.current) {
            new TWEEN.Tween(centralWorldRef.current.rotation)
              .to({ x: 0, y: 0, z: 0 }, 500)
              .easing(TWEEN.Easing.Quadratic.Out)
              .start();
          }
          interactionRef.current.zoom.target = isMobile ? 7 : 12;
          e.stopPropagation();
          return;
        }
        interactionRef.current.lastTapTime = now;
      }
      
      if (e.touches.length === 2) {
        // Two finger pinch/zoom
        const initialDistance = getPinchDistance(e);
        interactionRef.current.pinchDistance = initialDistance;
        interactionRef.current.lastPinchTime = now;
        
        // Detect pinch orientation to determine if it's a zoom or rotation
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const angle = Math.atan2(
          touch2.clientY - touch1.clientY,
          touch2.clientX - touch1.clientX
        );
        
        // Store reference angle for rotation detection
        interactionRef.current.pinchStartAngle = angle;
      } else if (e.touches.length === 1) {
        // Single finger pan/rotation
        interactionRef.current.touchId = e.touches[0].identifier;
        interactionRef.current.lastX = e.touches[0].clientX;
        interactionRef.current.lastY = e.touches[0].clientY;
        interactionRef.current.isInteracting = true;
        interactionRef.current.isDragging = false;
        interactionRef.current.startTime = now;
      }
    }, { passive: false });

    // Enhanced touchmove with better gesture handling
    container.addEventListener('touchmove', (e) => {
      e.preventDefault();
      
      // Handle two-finger pinch for zoom
      if (e.touches.length === 2) {
        const currentTime = Date.now();
        
        // Improved pinch-to-zoom with smoother response
        const currentDistance = getPinchDistance(e);
        const deltaDistance = currentDistance - interactionRef.current.pinchDistance;
        
        // Scale zoom sensitivity based on current zoom level for better control
        const zoomSensitivity = isMobile ? 0.02 : 0.01;
        const adaptiveSensitivity = zoomSensitivity * (interactionRef.current.zoom.current / interactionRef.current.zoom.min);
        
        // Apply zoom with dynamic sensitivity
        interactionRef.current.zoom.target = Math.max(
          interactionRef.current.zoom.min,
          Math.min(interactionRef.current.zoom.max,
            interactionRef.current.zoom.target - (deltaDistance * adaptiveSensitivity)
          )
        );
        
        interactionRef.current.pinchDistance = currentDistance;
        interactionRef.current.lastPinchTime = currentTime;
        
        // Track pinch rotation for twisting effect
        if (centralWorldRef.current) {
          const touch1 = e.touches[0];
          const touch2 = e.touches[1];
          const currentAngle = Math.atan2(
            touch2.clientY - touch1.clientY,
            touch2.clientX - touch1.clientX
          );
          
          if (interactionRef.current.pinchStartAngle !== undefined) {
            const angleChange = currentAngle - interactionRef.current.pinchStartAngle;
            centralWorldRef.current.rotation.z += angleChange * 0.5; // Apply rotation around z-axis
            interactionRef.current.pinchStartAngle = currentAngle;
          }
        }
      } 
      // Handle single-finger rotation
      else if (e.touches.length === 1) {
        const primaryTouch = e.touches[0];
        
        // Enhanced drag detection with precise threshold
        const dx = primaryTouch.clientX - interactionRef.current.lastX;
        const dy = primaryTouch.clientY - interactionRef.current.lastY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > interactionRef.current.dragThreshold) {
          interactionRef.current.isDragging = true;
        }
        
        // Apply rotation to the central world with improved sensitivity
        if (interactionRef.current.isInteracting && centralWorldRef.current) {
          // Adjust sensitivity for different screen sizes and devices
          const rotationSensitivity = isMobile ? 0.015 : 0.008;
          
          // Scale sensitivity based on zoom level for consistent feel
          const zoomScaleFactor = interactionRef.current.zoom.current / interactionRef.current.zoom.min;
          const adaptiveRotationSensitivity = rotationSensitivity * zoomScaleFactor;
          
          // More intuitive rotation - horizontal movement rotates around Y axis
          centralWorldRef.current.rotation.y += dx * adaptiveRotationSensitivity;
          
          // Vertical movement rotates around X axis
          centralWorldRef.current.rotation.x += dy * adaptiveRotationSensitivity;
          
          // Store momentum for inertia effect
          interactionRef.current.momentum = {
            x: dx * adaptiveRotationSensitivity * 0.9,
            y: dy * adaptiveRotationSensitivity * 0.9
          };
        }
        
        interactionRef.current.lastX = primaryTouch.clientX;
        interactionRef.current.lastY = primaryTouch.clientY;
      }
    }, { passive: false });

    // Enhanced touchend with better tap detection and inertia
    container.addEventListener('touchend', (e) => {
      e.preventDefault();
      
      // If we have no more touches, end the interaction
      if (e.touches.length === 0) {
        const wasInteracting = interactionRef.current.isInteracting;
        interactionRef.current.isInteracting = false;
        interactionRef.current.touchId = null;
        
        // Check if this was a short tap (not a drag)
        const tapDuration = Date.now() - interactionRef.current.startTime;
        const wasTap = !interactionRef.current.isDragging && tapDuration < 300;
        
        // Handle bubble selection on tap
        if (wasTap) {
          handleBubbleClick(e);
        }
        
        // Apply momentum for a natural feeling inertia effect
        if (wasInteracting && centralWorldRef.current) {
          // Customize decay for different devices
          const decay = isMobile ? 0.92 : 0.95;
          
          // Apply smoother deceleration with dynamic friction
          const applyMomentum = () => {
            if (!centralWorldRef.current) return;
            
            const momentum = interactionRef.current.momentum;
            const threshold = 0.0001;
            
            if (Math.abs(momentum.x) > threshold || Math.abs(momentum.y) > threshold) {
              centralWorldRef.current.rotation.y += momentum.x;
              centralWorldRef.current.rotation.x += momentum.y;
              
              // Apply adaptive decay based on velocity for more natural physics
              const speedFactor = Math.min(1, Math.max(0.8, 
                Math.sqrt(momentum.x * momentum.x + momentum.y * momentum.y) * 10));
              
              momentum.x *= decay * speedFactor;
              momentum.y *= decay * speedFactor;
              
              requestAnimationFrame(applyMomentum);
            }
          };
          
          applyMomentum();
        }
      } else {
        // Update the primary touch if the current one ended
        interactionRef.current.touchId = getPrimaryTouchId(e);
        
        if (interactionRef.current.touchId !== null) {
          const primaryTouch = getTouchById(e, interactionRef.current.touchId);
          if (primaryTouch) {
            interactionRef.current.lastX = primaryTouch.clientX;
            interactionRef.current.lastY = primaryTouch.clientY;
          }
        }
      }
    }, { passive: false });

    // Prevent touchcancel from leaving stuck rotation
    container.addEventListener('touchcancel', (e) => {
      interactionRef.current.isInteracting = false;
      interactionRef.current.touchId = null;
      interactionRef.current.momentum = { x: 0, y: 0 };
    }, { passive: false });

    // Improved bubble click detection optimized for mobile
    const handleBubbleClick = (event: MouseEvent | TouchEvent) => {
      // If we're dragging, don't treat it as a click
      if (interactionRef.current.isDragging) return;
      
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
      if (cameraRef.current) {
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

        // First, get all the bubble meshes (first child of each bubble group)
        const bubbleMeshes: THREE.Object3D[] = [];
        Object.values(bubblesRef.current).forEach(group => {
          if (group.children[0]) {
            bubbleMeshes.push(group.children[0]);
          }
        });

        // Then check for intersections
        const intersects = raycasterRef.current.intersectObjects(bubbleMeshes, false);

        if (intersects.length > 0) {
          // Get the parent group of the intersected bubble
          const bubbleGroup = intersects[0].object.parent;
          if (bubbleGroup && bubbleGroup.userData && bubbleGroup.userData.id) {
            // Add a small visual feedback on click
            const bubble = intersects[0].object;
            const scale = { value: 1 };
            new TWEEN.Tween(scale)
              .to({ value: 1.2 }, 150)
              .easing(TWEEN.Easing.Quadratic.Out)
              .onUpdate(() => {
                bubble.scale.set(scale.value, scale.value, scale.value);
              })
              .chain(
                new TWEEN.Tween(scale)
                  .to({ value: 1 }, 150)
                  .easing(TWEEN.Easing.Quadratic.In)
                  .onUpdate(() => {
                    bubble.scale.set(scale.value, scale.value, scale.value);
                  })
              )
              .start();
            
            // Call the click handler with the bubble ID
            onBubbleClick(bubbleGroup.userData.id);
          }
        }
      }
    };

    // Mouse events (for desktop compatibility)
    container.addEventListener('mousedown', (e) => {
      startInteraction(e.clientX, e.clientY);
      interactionRef.current.isDragging = false;
      interactionRef.current.startTime = Date.now();
    });

    container.addEventListener('mousemove', (e) => {
      if (interactionRef.current.isInteracting) {
        // Check if we've moved enough to count as dragging
        const dx = e.clientX - interactionRef.current.lastX;
        const dy = e.clientY - interactionRef.current.lastY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > interactionRef.current.dragThreshold) {
          interactionRef.current.isDragging = true;
        }
      }
      moveInteraction(e.clientX, e.clientY);
    });

    container.addEventListener('mouseup', (e) => {
      endInteraction(e);
    });

    container.addEventListener('mouseleave', () => {
      endInteraction();
    });

    // Mouse wheel zoom with improved sensitivity and smoother behavior
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoom = interactionRef.current.zoom;
      // Non-linear scaling for smoother zoom at different distances
      const zoomSensitivity = 0.005 * (zoom.current / zoom.min);
      const delta = e.deltaY * zoomSensitivity;
      
      zoom.target = Math.max(zoom.min, Math.min(zoom.max, zoom.target + delta));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    // Unified interaction handling for both mouse and touch
    const startInteraction = (clientX: number, clientY: number) => {
      interactionRef.current.isInteracting = true;
      interactionRef.current.lastX = clientX;
      interactionRef.current.lastY = clientY;
    };

    const moveInteraction = (clientX: number, clientY: number) => {
      if (!interactionRef.current.isInteracting || !centralWorldRef.current) return;

      // Adjusted sensitivity for better mobile control
      const isMobile = interactionRef.current.isMobile;
      const sensitivity = isMobile ? 0.02 : 0.01;
      const deltaX = (clientX - interactionRef.current.lastX) * sensitivity;
      const deltaY = (clientY - interactionRef.current.lastY) * sensitivity;

      centralWorldRef.current.rotation.y += deltaX;
      centralWorldRef.current.rotation.x += deltaY;

      interactionRef.current.momentum = {
        x: deltaX * 0.8,
        y: deltaY * 0.8
      };

      interactionRef.current.lastX = clientX;
      interactionRef.current.lastY = clientY;
    };

    const endInteraction = (event?: MouseEvent | TouchEvent) => {
      if (!interactionRef.current.isInteracting) return;
      
      const wasInteracting = interactionRef.current.isInteracting;
      interactionRef.current.isInteracting = false;

      // Handle click or tap only if it wasn't a drag
      if (event) {
        handleBubbleClick(event);
      }

      // Improved momentum physics - more responsive on mobile
      if (wasInteracting) {
        const isMobile = interactionRef.current.isMobile;
        const decay = isMobile ? 0.9 : 0.95; // Faster decay on mobile for more control
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

    // Improved animation loop with smoother bubble movement
    let time = 0;
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      time += 0.002;
      
      // Smoother zoom transition - faster on mobile
      const zoom = interactionRef.current.zoom;
      const isMobile = interactionRef.current.isMobile;
      const zoomLerpFactor = isMobile ? 0.2 : 0.1;
      zoom.current += (zoom.target - zoom.current) * zoomLerpFactor;
      if (camera) {
        camera.position.z = zoom.current;
      }

      // Calculate zoom scaling factor with improved formula
      const zoomRange = interactionRef.current.zoom.max - interactionRef.current.zoom.min;
      const normalizedZoom = (interactionRef.current.zoom.max - zoom.current) / zoomRange;
      const zoomFactor = 1 + Math.pow(normalizedZoom, 1.2);
      
      // Update bubbles with improved floating movement
      Object.values(bubblesRef.current).forEach(bubble => {
        const userData = bubble.userData;
        const movement = userData.movement;
        const origPos = movement.originalPosition;
        
        // Calculate smoother floating movement using unique parameters for each axis
        const floatX = Math.sin(time * movement.frequency.x + movement.phase.x) * movement.amplitude.x;
        const floatY = Math.cos(time * movement.frequency.y + movement.phase.y) * movement.amplitude.y;
        const floatZ = Math.sin(time * movement.frequency.z + movement.phase.z) * movement.amplitude.z;
        
        // Calculate rotated position based on central world rotation
        const rotationOffset = new THREE.Euler(
          centralWorld.rotation.x,
          centralWorld.rotation.y,
          centralWorld.rotation.z
        );
        
        // Calculate target position with orbit and floating combined
        const targetPos = new THREE.Vector3(
          origPos.x + floatX,
          origPos.y + floatY,
          origPos.z + floatZ
        ).applyEuler(rotationOffset);
        
        // Smoother movement for mobile - faster transition
        const transitionDuration = isMobile ? 800 : 1200;
        
        // Use TWEEN for smoother transitions between positions
        new TWEEN.Tween(bubble.position)
          .to(targetPos, transitionDuration)
          .easing(TWEEN.Easing.Quadratic.Out)
          .start();
        
        // Face bubbles toward camera
        bubble.quaternion.copy(camera.quaternion);
        
        // Scale the bubble and text based on zoom level
        const origScale = userData.originalScale;
        const bubbleMesh = bubble.children[0] as THREE.Mesh;
        
        // Apply scale to bubble
        const scaleFactor = origScale * zoomFactor;
        bubbleMesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
        
        // Scale text sprites with better positioning
        for (let i = 1; i < bubble.children.length; i++) {
          const sprite = bubble.children[i] as THREE.Sprite;
          const textScales = userData.textScales;
          const textScaleFactor = zoomFactor * 0.8;
          
          // Scale and position based on which text element it is
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

      // Gentle auto-rotation - slower on mobile for better control
      if (!interactionRef.current.isInteracting) {
        centralWorld.rotation.y += isMobile ? 0.0002 : 0.0003;
      }

      TWEEN.update();
      renderer.render(scene, camera);
    };

    animate();

    // Mobile-optimized window resize handling
    const handleResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      // Update mobile detection on resize
      const isMobile = width < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      interactionRef.current.isMobile = isMobile;
      
      if (camera) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
      
      if (renderer) {
        renderer.setSize(width, height);
      }
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
  }, [topics, onBubbleClick]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full touch-none select-none"
      style={{ touchAction: 'none' }}
    />
  );
};

export default BubbleWorld;
