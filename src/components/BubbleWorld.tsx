
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
} from '@/utils/bubbleUtils';
import { useNavigate } from 'react-router-dom';

// Format time remaining for display
const formatTimeRemaining = (expiryTime: Date) => {
  try {
    const now = new Date();
    const timeDiff = expiryTime.getTime() - now.getTime();
    if (timeDiff <= 0) return "Expired";
    
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  } catch (error) {
    console.error("Error formatting time remaining:", error);
    return "Time error";
  }
};

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
  const particlesRef = useRef<{[key: string]: THREE.Points}>({});
  const worldGroupRef = useRef<THREE.Group | null>(null); // Add a group ref to hold all bubbles and central world
  const interactionRef = useRef({
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
  
  // Add navigation
  const navigate = useNavigate();

  useEffect(() => {
    if (!containerRef.current) return;
    
    console.log("BubbleWorld initialization with topics:", topics);

    const container = containerRef.current;
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Use a soft light background color that complements the gold bubbles
    scene.background = new THREE.Color('#F9F7F0');

    const width = container.clientWidth;
    const height = container.clientHeight;
    const isMobile = width < 768;

    // Create perspective camera with improved field of view for better immersion
    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
    
    // Position camera for better view - move further back on mobile
    camera.position.z = isMobile ? 14 : 12;
    camera.position.y = isMobile ? 1.5 : 1; // Slightly higher on mobile for better perspective
    
    interactionRef.current.zoom.current = camera.position.z;
    interactionRef.current.zoom.target = camera.position.z;
    cameraRef.current = camera;

    // Enhanced renderer with better anti-aliasing for smoother edges
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Enhanced lighting setup for more realistic bubble appearance
    const ambientLight = new THREE.AmbientLight('#FFFFFF', 1.5);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight('#FFFFFF', '#F5E1C0', 1.5);
    scene.add(hemisphereLight);

    const mainLight = new THREE.DirectionalLight('#FFFFFF', 2.2);
    mainLight.position.set(5, 7, 8);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    scene.add(mainLight);

    const secondaryLight = new THREE.DirectionalLight('#FFF5E0', 1.2);
    secondaryLight.position.set(-7, -5, -8);
    scene.add(secondaryLight);

    // Add subtle point light at the center to enhance the central world glow
    const centerLight = new THREE.PointLight('#FBE8A6', 1.5, 10);
    centerLight.position.set(0, 0, 0);
    scene.add(centerLight);

    // Create a group to hold all bubbles and central world for unified rotation
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);
    worldGroupRef.current = worldGroup;
    
    // Create central world with enhanced appearance
    const worldGeometry = createCentralWorldGeometry();
    const worldMaterial = createCentralWorldMaterial();
    const centralWorld = new THREE.Mesh(worldGeometry, worldMaterial);
    centralWorld.castShadow = true;
    centralWorld.receiveShadow = true;
    // Adjust central world size
    centralWorld.scale.set(1.2, 1.2, 1.2);
    centralWorldRef.current = centralWorld;
    worldGroup.add(centralWorld); // Add central world to the group instead of the scene

    // Add subtle environment fog for depth
    scene.fog = new THREE.FogExp2('#F9F7F0', 0.03);

    // Create explosion particles function with more realistic effect
    const createExplosionParticles = (position: THREE.Vector3, size: number) => {
      const particleCount = 250; // More particles for richer effect
      const geometry = new THREE.BufferGeometry();
      const initialPositions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      
      // Start all particles at center
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        initialPositions[i3] = 0;
        initialPositions[i3 + 1] = 0;
        initialPositions[i3 + 2] = 0;
        
        // Gradient from gold to amber for more vibrant explosion
        const colorRand = Math.random();
        colors[i3] = 0.9 + (colorRand * 0.1);     // R
        colors[i3 + 1] = 0.7 + (colorRand * 0.2);  // G
        colors[i3 + 2] = 0.2 + (colorRand * 0.1);  // B
      }
      
      geometry.setAttribute('position', new THREE.BufferAttribute(initialPositions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      
      // Enhanced particle material with better blending and size
      const material = new THREE.PointsMaterial({
        size: 0.15,
        transparent: true,
        opacity: 1,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
        depthWrite: false
      });
      
      const particles = new THREE.Points(geometry, material);
      particles.position.copy(position);
      scene.add(particles);
      
      // More complex explosion animation
      const positions = particles.geometry.attributes.position.array;
      const dirs = [];
      
      // Create varied explosion directions
      for (let i = 0; i < particleCount; i++) {
        const speed = 0.5 + Math.random() * 4.5;
        const angle1 = Math.random() * Math.PI * 2;
        const angle2 = Math.random() * Math.PI * 2;
        
        dirs.push({
          x: Math.sin(angle1) * Math.cos(angle2) * speed,
          y: Math.sin(angle1) * Math.sin(angle2) * speed, 
          z: Math.cos(angle1) * speed
        });
      }
      
      // Two-phase animation: explosion and fade
      const duration = 2000;
      new TWEEN.Tween({ progress: 0, opacity: 1 })
        .to({ progress: 1, opacity: 0 }, duration)
        .easing(TWEEN.Easing.Exponential.Out)
        .onUpdate(({ progress, opacity }) => {
          for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Non-linear expansion for more natural look
            const expandFactor = progress < 0.3 
              ? progress * 3.3 
              : 1 + (progress - 0.3) * 0.5;
            
            positions[i3] = dirs[i].x * expandFactor * size;
            positions[i3 + 1] = dirs[i].y * expandFactor * size;
            positions[i3 + 2] = dirs[i].z * expandFactor * size;
          }
          particles.geometry.attributes.position.needsUpdate = true;
          
          // Fade out gradually
          (particles.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - (progress * 1.2));
        })
        .onComplete(() => {
          scene.remove(particles);
        })
        .start();
      
      return particles;
    };

    // Check if topics array exists and has items
    if (topics && topics.length > 0) {
      // Improved positioning system for mobile and desktop
      
      // Determine number of layers based on screen size and topic count
      const numTopics = topics.length;
      // More layers on mobile to prevent overlap
      const numLayers = isMobile 
        ? Math.min(Math.ceil(numTopics / 3), 5) // Max 5 layers on mobile
        : Math.min(Math.ceil(numTopics / 4), 3); // Max 3 layers on desktop
      
      // Calculate optimal bubbles per layer
      const bubblesPerLayer = Math.ceil(numTopics / numLayers);
      
      // Calculate base radius - smaller on mobile to fit screen
      const baseRadius = isMobile ? 2.8 : 3.5;
      // More spacing between layers on mobile
      const layerSpacing = isMobile ? 3.0 : 2.5;
      
      // Pre-calculate positions to check for overlaps
      const positions: {x: number, y: number, z: number, size: number}[] = [];
      
      topics.forEach((topic, index) => {
        // Skip if bubble is already in exploding animation
        if (topic.isExploding) {
          // Use the last known position or a default
          const lastKnownBubble = bubblesRef.current[topic.id];
          if (lastKnownBubble) {
            const position = lastKnownBubble.position.clone();
            const size = topic.size === 'lg' ? 1.3 : 
                        topic.size === 'md' ? 1.0 : 0.7;
            const finalSize = size * (1 + topic.reflect_count * 0.1);
            
            particlesRef.current[topic.id] = createExplosionParticles(position, finalSize * 2);
            
            // Remove the original bubble
            worldGroup.remove(lastKnownBubble); // Remove from worldGroup instead of scene
            delete bubblesRef.current[topic.id];
          }
          return;
        }
        
        const bubbleGroup = new THREE.Group();
        
        // Adjust base sizes for better visibility - smaller on mobile
        const baseSize = isMobile 
          ? (topic.size === 'lg' ? 1.0 : topic.size === 'md' ? 0.8 : 0.6)
          : (topic.size === 'lg' ? 1.3 : topic.size === 'md' ? 1.0 : 0.7);
        
        const reflectScale = 1 + (topic.reflect_count * 0.1);
        const finalSize = baseSize * reflectScale;
        
        const geometry = createBubbleGeometry(finalSize);
        const material = createBubbleMaterial();
        const bubble = new THREE.Mesh(geometry, material);
        bubble.castShadow = true;
        bubble.receiveShadow = true;
        bubbleGroup.add(bubble);

        // Calculate time until expiry
        const now = new Date();
        const expiryTime = topic.expires_at ? new Date(topic.expires_at) : new Date(now.getTime() + 24*60*60*1000);
        const timeUntilExpiry = Math.max(0, expiryTime.getTime() - now.getTime());
        const expiryRatio = timeUntilExpiry / (24*60*60*1000); // 0-1 value, 1 is fresh, 0 is expired
        
        // Make newer bubbles more vibrant
        if (material instanceof THREE.MeshPhysicalMaterial) {
          // Enhanced bubble appearance based on expiry time
          material.opacity = 0.5 + (expiryRatio * 0.5); // More transparent as it ages
          material.transmission = 0.2 + (expiryRatio * 0.3);
          material.emissive = new THREE.Color(0xebbd34);
          material.emissiveIntensity = 0.05 + (expiryRatio * 0.25); // Stronger glow for fresh bubbles
          material.clearcoat = 1.0;
          material.clearcoatRoughness = 0.1;
          material.metalness = 0.1;
          material.roughness = 0.2;
        }

        // Determine which layer this bubble belongs to using strict assignments
        const layerIndex = Math.floor(index / bubblesPerLayer);
        
        // Calculate position within the layer with fixed angles
        const layerBubbleIndex = index % bubblesPerLayer;
        const angleStep = (2 * Math.PI) / bubblesPerLayer;
        const baseAngle = layerBubbleIndex * angleStep;
        
        // Reduce angle variation to minimize overlap
        const angleVariation = isMobile ? angleStep * 0.1 : angleStep * 0.2;
        
        // Use golden ratio to distribute bubbles more evenly
        const goldenRatio = 1.618033988749895;
        const angle = baseAngle + (((index * goldenRatio) % 1) * 2 - 1) * angleVariation;
        
        // Radius increases with each layer - more space between layers on mobile
        const radius = baseRadius + (layerIndex * layerSpacing);
        
        // Vertical positioning alternates by layer to further reduce overlap
        const baseY = isMobile 
          ? (layerIndex % 3 - 1) * 1.8 // Three levels of vertical placement for mobile
          : (layerIndex % 2 === 0) ? 0 : 1.5;
        
        // Reduced vertical variation on mobile
        const yVariation = isMobile ? 0.4 : 0.8;
        
        // Deterministic vertical position based on index for more predictable placement
        const y = baseY + ((index % bubblesPerLayer) / bubblesPerLayer - 0.5) * yVariation;

        // Calculate potential position
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        // Check for overlaps with previously positioned bubbles
        let hasOverlap = false;
        let attempts = 0;
        const maxAttempts = 10;
        let finalX = x;
        let finalY = y;
        let finalZ = z;
        
        // Try to find non-overlapping position
        while (attempts < maxAttempts) {
          hasOverlap = false;
          
          for (const pos of positions) {
            // Calculate distance between centers
            const dx = finalX - pos.x;
            const dy = finalY - pos.y;
            const dz = finalZ - pos.z;
            
            const distanceSquared = dx * dx + dy * dy + dz * dz;
            // Minimum distance is sum of radii plus a buffer
            const minDistance = (finalSize + pos.size) * 1.2; // 20% buffer
            
            if (distanceSquared < minDistance * minDistance) {
              hasOverlap = true;
              break;
            }
          }
          
          if (!hasOverlap) break;
          
          // If overlap, adjust position slightly
          attempts++;
          
          // Adjust more aggressively as attempts increase
          const adjustFactor = 0.2 + (attempts * 0.05);
          
          // Try different avoidance strategies based on attempt number
          if (attempts % 3 === 0) {
            // Adjust radius
            const newRadius = radius * (1 + (attempts * 0.03));
            finalX = Math.cos(angle) * newRadius;
            finalZ = Math.sin(angle) * newRadius;
          } else if (attempts % 3 === 1) {
            // Adjust angle
            const angleAdjust = (attempts * 0.1) * angleStep;
            finalX = Math.cos(baseAngle + angleAdjust) * radius;
            finalZ = Math.sin(baseAngle + angleAdjust) * radius;
          } else {
            // Adjust height
            finalY = y + (attempts * 0.3 * (attempts % 2 === 0 ? 1 : -1));
          }
        }
        
        // Add the final position to our list
        positions.push({
          x: finalX,
          y: finalY,
          z: finalZ,
          size: finalSize
        });

        bubbleGroup.userData = {
          id: topic.id,
          orbitIndex: index,
          originalScale: finalSize,
          textScales: {
            nameScale: finalSize * 1.6, // Larger text scales for better readability
            topicScale: finalSize * 1.4,
            reflectScale: finalSize * 1.2,
            timeScale: finalSize
          },
          // More structured movement with reduced randomness for mobile
          movement: {
            speed: isMobile
              ? (0.0008 + (Math.random() * 0.0005)) * (0.5 + expiryRatio * 0.5)
              : (0.001 + (Math.random() * 0.0015)) * (0.5 + expiryRatio * 0.5),
            radius: radius,
            angle: angle,
            layer: layerIndex,
            verticalSpeed: isMobile
              ? (0.001 + (Math.random() * 0.0005)) * expiryRatio
              : (0.002 + (Math.random() * 0.001)) * expiryRatio,
            verticalRange: isMobile 
              ? 0.4 + (Math.random() * 0.4) * expiryRatio
              : 0.8 + (Math.random() * 0.8) * expiryRatio,
            verticalOffset: baseY + Math.random() * Math.PI * 2,
            rotationSpeed: 0.003 + (Math.random() * 0.006),
            wobble: isMobile 
              ? Math.random() * 0.001 * expiryRatio // Less wobble on mobile
              : Math.random() * 0.002 * expiryRatio
          },
          expiryRatio, // Store for animation use
          expiryTime // Store actual time
        };

        // Create text labels with enhanced visibility
        // Smaller fonts for mobile to prevent label overlap
        const fontSizes = {
          name: isMobile ? 32 : 44,
          topic: isMobile ? 26 : 36,
          reflect: isMobile ? 24 : 32,
          time: isMobile ? 22 : 30
        };
        
        // Create a container object for text sprites to ensure they stay properly aligned
        const textContainer = new THREE.Object3D();
        bubbleGroup.add(textContainer);
        
        const createLabelSprite = (text: string, position: THREE.Vector3, fontSize: number) => {
          const canvas = createTextCanvas(text, fontSize);
          const texture = new THREE.CanvasTexture(canvas);
          texture.needsUpdate = true;
          
          const spriteMaterial = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true,
            depthTest: false
          });
          
          const sprite = new THREE.Sprite(spriteMaterial);
          sprite.scale.set(
            finalSize * (isMobile ? 1.5 : 1.8), // Slightly narrower on mobile
            finalSize * (isMobile ? 0.75 : 0.9), 
            1
          );
          
          sprite.position.copy(position);
          return sprite;
        };

        // Position text labels with better spacing for mobile
        const textSpacing = isMobile ? 0.8 : 1.0; // Scale factor for text spacing
        
        textContainer.add(createLabelSprite(
          topic.name, 
          new THREE.Vector3(0, finalSize * 0.4 * textSpacing, 0), 
          fontSizes.name
        ));
        
        textContainer.add(createLabelSprite(
          topic.topic, 
          new THREE.Vector3(0, -finalSize * 0.1 * textSpacing, 0), 
          fontSizes.topic
        ));
        
        textContainer.add(createLabelSprite(
          `⭐ ${topic.reflect_count}`, 
          new THREE.Vector3(0, -finalSize * 0.5 * textSpacing, 0), 
          fontSizes.reflect
        ));
        
        // Add time remaining label
        textContainer.add(createLabelSprite(
          `⏱ ${formatTimeRemaining(expiryTime)}`, 
          new THREE.Vector3(0, -finalSize * 0.85 * textSpacing, 0), 
          fontSizes.time
        ));

        // Set initial position
        bubbleGroup.position.set(finalX, finalY, finalZ);
        
        bubblesRef.current[topic.id] = bubbleGroup;
        worldGroup.add(bubbleGroup); // Add to worldGroup instead of scene
      });
    } else {
      console.log("No topics to render in BubbleWorld");
    }

    // Improved touch handling
    let initialPinchDistance = 0;
    
    const getPinchDistance = (e: TouchEvent) => {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      return Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );
    };

    const onTouchStart = (e: TouchEvent) => {
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
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const currentDistance = getPinchDistance(e);
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
        
        if (interactionRef.current.isDragging && worldGroupRef.current) {
          const dx = touch.clientX - interactionRef.current.lastX;
          const dy = touch.clientY - interactionRef.current.lastY;
          
          worldGroupRef.current.rotation.y += dx * 0.01;
          worldGroupRef.current.rotation.x += dy * 0.01;
          
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
          const touch = e.changedTouches[0];
          const rect = container.getBoundingClientRect();
          const x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
          const y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
          mouseRef.current.set(x, y);
          handleBubbleClick(e);
        }
        
        if (wasDragging && worldGroupRef.current) {
          const decay = 0.95;
          const applyMomentum = () => {
            if (!worldGroupRef.current) return;
            
            const momentum = interactionRef.current.momentum;
            if (Math.abs(momentum.x) > 0.0001 || Math.abs(momentum.y) > 0.0001) {
              worldGroupRef.current.rotation.y += momentum.x;
              worldGroupRef.current.rotation.x += momentum.y;
              momentum.x *= decay;
              momentum.y *= decay;
              requestAnimationFrame(applyMomentum);
            }
          };
          
          applyMomentum();
        }
      }
    };

    // Handle bubble clicks with improved interaction
    const handleBubbleClick = (event: MouseEvent | TouchEvent) => {
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

      if (camera) {
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
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      interactionRef.current.isInteracting = true;
      interactionRef.current.lastX = e.clientX;
      interactionRef.current.lastY = e.clientY;
      interactionRef.current.isDragging = false;
      interactionRef.current.startX = e.clientX;
      interactionRef.current.startY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!interactionRef.current.isInteracting || !worldGroupRef.current) return;

      const deltaX = Math.abs(e.clientX - interactionRef.current.startX);
      const deltaY = Math.abs(e.clientY - interactionRef.current.startY);
      
      if (deltaX > interactionRef.current.moveThreshold || 
          deltaY > interactionRef.current.moveThreshold) {
        interactionRef.current.isDragging = true;
      }
      
      if (interactionRef.current.isDragging) {
        const dx = e.clientX - interactionRef.current.lastX;
        const dy = e.clientY - interactionRef.current.lastY;

        worldGroupRef.current.rotation.y += dx * 0.005;
        worldGroupRef.current.rotation.x += dy * 0.005;

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

      if (wasDragging && worldGroupRef.current) {
        const decay = 0.95;
        const applyMomentum = () => {
          if (!worldGroupRef.current) return;
          
          const momentum = interactionRef.current.momentum;
          if (Math.abs(momentum.x) > 0.0001 || Math.abs(momentum.y) > 0.0001) {
            worldGroupRef.current.rotation.y += momentum.x;
            worldGroupRef.current.rotation.x += momentum.y;
            momentum.x *= decay;
            momentum.y *= decay;
            requestAnimationFrame(applyMomentum);
          }
        };
        
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

    // Add event listeners with proper cleanup
    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd);
    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseup', onMouseUp);
    container.addEventListener('mouseleave', onMouseLeave);
    container.addEventListener('wheel', onWheel, { passive: false });

    // Animation and update function
    const animate = () => {
      TWEEN.update();

      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      
      if (!camera || !renderer) return;
      
      // Handle camera zoom with smooth transition
      const zoom = interactionRef.current.zoom;
      if (Math.abs(zoom.current - zoom.target) > 0.01) {
        zoom.current += (zoom.target - zoom.current) * 0.05;
        camera.position.z = zoom.current;
      }
      
      // Make sure camera is looking at the center
      camera.lookAt(new THREE.Vector3(0, 0, 0));
      
      // Make all bubbles face the camera (billboard effect for text)
      Object.values(bubblesRef.current).forEach(bubbleGroup => {
        // Get the text container (second child of the bubble group)
        const textContainer = bubbleGroup.children[1];
        if (textContainer) {
          textContainer.quaternion.copy(camera.quaternion);
        }
        
        // Apply gentle floating and wobbling movements
        const movement = bubbleGroup.userData.movement;
        const time = Date.now() * 0.001;
        
        // Update angle based on orbital speed
        movement.angle += movement.speed;
        
        // Calculate new position
        const radius = movement.radius;
        bubbleGroup.position.x = Math.cos(movement.angle) * radius;
        bubbleGroup.position.z = Math.sin(movement.angle) * radius;
        
        // Add gentle vertical bobbing
        bubbleGroup.position.y += Math.sin(time * movement.verticalSpeed + movement.verticalOffset) * 0.005;
        
        // Apply slight rotation to the bubble for more liveliness
        bubbleGroup.rotation.y += movement.rotationSpeed * 0.01;
        
        // Add subtle wobble to the movement
        if (movement.wobble > 0) {
          bubbleGroup.position.x += Math.sin(time * 0.7) * movement.wobble;
          bubbleGroup.position.z += Math.cos(time * 0.6) * movement.wobble;
        }
      });
      
      // Animate central world with gentle rotation
      if (centralWorldRef.current) {
        centralWorldRef.current.rotation.y += 0.001;
        centralWorldRef.current.rotation.x += 0.0005;
      }
      
      renderer.render(sceneRef.current as THREE.Scene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate();

    // Window resize handler
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const container = containerRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      
      rendererRef.current.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      console.log("Cleaning up BubbleWorld");
      window.removeEventListener('resize', handleResize);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('mousedown', onMouseDown);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('mouseleave', onMouseLeave);
      container.removeEventListener('wheel', onWheel);
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
        container.removeChild(rendererRef.current.domElement);
      }
    };
  }, [topics, onBubbleClick, navigate]);

  return (
    <div ref={containerRef} className="h-full w-full" />
  );
};

export default BubbleWorld;
