<lov-code>
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
  mesh as globalMesh
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

// Class to handle the physics simulation of each bubble
class PhysicsBubble {
  mesh: THREE.Group;
  velocity: THREE.Vector3;
  acceleration: THREE.Vector3;
  mass: number;
  radius: number;
  isColliding: boolean;
  centralWorldPos: THREE.Vector3;
  centralWorldRef: THREE.Mesh | null;
  id: string;
  lastUpdateTime: number;
  expiryTime: Date;
  
  constructor(mesh: THREE.Group, id: string, mass: number, radius: number, expiryTime: Date, centralWorldRef: THREE.Mesh | null) {
    this.mesh = mesh;
    this.id = id;
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.005, // Reduced initial velocity for calmer movement
      (Math.random() - 0.5) * 0.005,
      (Math.random() - 0.5) * 0.005
    );
    this.acceleration = new THREE.Vector3(0, 0, 0);
    this.mass = mass;
    this.radius = radius;
    this.isColliding = false;
    this.centralWorldPos = new THREE.Vector3(0, 0, 0);
    this.centralWorldRef = centralWorldRef;
    this.lastUpdateTime = Date.now();
    this.expiryTime = expiryTime;
  }
  
  applyForce(force: THREE.Vector3) {
    // F = ma => a = F/m
    const f = force.clone().divideScalar(this.mass);
    this.acceleration.add(f);
  }
  
  updateVelocity(timeDelta: number) {
    // Limit maximum speed - reduced for calmer movement
    const maxSpeed = 0.02; // Reduced from 0.05
    if (this.velocity.length() > maxSpeed) {
      this.velocity.normalize().multiplyScalar(maxSpeed);
    }
    
    // Add a stronger drag force to dampen velocity more aggressively
    this.velocity.multiplyScalar(0.97); // Increased drag from 0.99
  }
  
  update(timeDelta: number) {
    // Apply gravity towards the central world
    const directionToCenter = new THREE.Vector3();
    
    if (this.centralWorldRef) {
      directionToCenter.copy(this.centralWorldRef.position).sub(this.mesh.position);
    } else {
      directionToCenter.copy(this.centralWorldPos).sub(this.mesh.position);
    }
    
    const distanceToCenter = directionToCenter.length();
    
    // Calculate gravity force based on distance - reduced strength for slower orbits
    const gravityStrength = 0.000005 * this.mass; // Reduced from 0.00001
    const minDistance = 2.5; // Increased minimum distance where gravity has full effect
    const maxDistance = 12.0; // Increased maximum distance
    
    // Scale gravity based on distance to create gentler orbits
    let gravityScale = 1.0;
    
    if (distanceToCenter > maxDistance) {
      // Increase gravity for bubbles that go too far
      gravityScale = 1.0 + (distanceToCenter - maxDistance) * 0.05; // Reduced from 0.1
    } else if (distanceToCenter < minDistance) {
      // Decrease gravity for bubbles too close to create a "repulsion" effect
      gravityScale = distanceToCenter / minDistance;
    }
    
    // Apply gravity force with reduced strength
    const gravityForce = directionToCenter.normalize().multiplyScalar(gravityStrength * gravityScale);
    this.applyForce(gravityForce);
    
    // Apply a smaller tangential force to encourage gentler orbital motion
    const tangent = new THREE.Vector3(
      -directionToCenter.z,
      0,
      directionToCenter.x
    ).normalize().multiplyScalar(gravityStrength * 0.3); // Reduced from 0.5
    this.applyForce(tangent);
    
    // Update velocity based on acceleration
    this.velocity.add(this.acceleration.clone().multiplyScalar(timeDelta));
    this.updateVelocity(timeDelta);
    
    // Update position with a dampening factor for even slower movement
    const positionDelta = this.velocity.clone().multiplyScalar(timeDelta * 0.8); // Added dampening factor
    this.mesh.position.add(positionDelta);
    
    // Reset acceleration for next frame
    this.acceleration.set(0, 0, 0);
    
    // Make text labels face the camera
    this.mesh.quaternion.copy(globalMesh.camera.quaternion);
    
    // Bubble slight rotation - reduced for calmer appearance
    this.mesh.children[0].rotation.y += 0.0005 * timeDelta; // Reduced from 0.001
    
    // Update last time
    this.lastUpdateTime = Date.now();
  }
  
  checkCollision(other: PhysicsBubble): boolean {
    const distanceVector = this.mesh.position.clone().sub(other.mesh.position);
    const distance = distanceVector.length();
    const minDistance = this.radius + other.radius;
    
    return distance < minDistance;
  }
  
  resolveCollision(other: PhysicsBubble) {
    const positionDiff = this.mesh.position.clone().sub(other.mesh.position);
    const distance = positionDiff.length();
    const minDistance = this.radius + other.radius;
    
    if (distance < minDistance) {
      // Mark as colliding
      this.isColliding = true;
      other.isColliding = true;
      
      // Calculate penetration depth
      const penetrationDepth = minDistance - distance;
      
      // Calculate collision normal
      const collisionNormal = positionDiff.clone().normalize();
      
      // Move bubbles apart based on penetration
      const pushRatio1 = other.mass / (this.mass + other.mass);
      const pushRatio2 = this.mass / (this.mass + other.mass);
      
      this.mesh.position.add(collisionNormal.clone().multiplyScalar(penetrationDepth * pushRatio1 * 0.7)); // Increased separation factor
      other.mesh.position.sub(collisionNormal.clone().multiplyScalar(penetrationDepth * pushRatio2 * 0.7));
      
      // Calculate relative velocity
      const relativeVelocity = this.velocity.clone().sub(other.velocity);
      
      // Calculate impulse scalar
      const velocityAlongNormal = relativeVelocity.dot(collisionNormal);
      
      // Only resolve if objects are moving toward each other
      if (velocityAlongNormal > 0) return;
      
      // Calculate restitution (bounciness) - reduced for softer collisions
      const restitution = 0.4; // Reduced from 0.6
      
      // Calculate impulse scalar
      let impulseScalar = -(1 + restitution) * velocityAlongNormal;
      impulseScalar /= 1/this.mass + 1/other.mass;
      
      // Apply impulse with reduced strength
      const impulse = collisionNormal.clone().multiplyScalar(impulseScalar * 0.7); // Added dampening factor
      
      this.velocity.add(impulse.clone().multiplyScalar(1/this.mass));
      other.velocity.sub(impulse.clone().multiplyScalar(1/other.mass));
      
      // Add very slight repulsion to help bubbles separate gently
      this.applyForce(collisionNormal.clone().multiplyScalar(0.00005)); // Reduced from 0.0001
      other.applyForce(collisionNormal.clone().multiplyScalar(-0.00005));
    } else {
      this.isColliding = false;
      other.isColliding = false;
    }
  }
}

// BubbleWorld component
const BubbleWorld = ({ topics, onBubbleClick }: BubbleWorldProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const animationFrameRef = useRef<number>();
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const centralWorldRef = useRef<THREE.Mesh | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const physicsBubblesRef = useRef<{ [key: string]: PhysicsBubble }>({});
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
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000); // Reduced FOV for less distortion
    
    // Position camera to view the world from a better angle
    camera.position.z = isMobile ? 15 : 18; // Increased distance for a wider view
    camera.position.y = 2; // Slightly above the center for a better looking-down perspective
    
    interactionRef.current.zoom.current = camera.position.z;
    interactionRef.current.zoom.target = camera.position.z;
    cameraRef.current = camera;
    
    // Store camera in global mesh object for text label orientation
    globalMesh.camera = camera;

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

    // Create central world with enhanced appearance
    const worldGeometry = createCentralWorldGeometry();
    const worldMaterial = createCentralWorldMaterial();
    const centralWorld = new THREE.Mesh(worldGeometry, worldMaterial);
    centralWorld.castShadow = true;
    centralWorld.receiveShadow = true;
    // Adjust central world size
    centralWorld.scale.set(1.8, 1.8, 1.8); // Increased size for better visibility
    centralWorldRef.current = centralWorld;
    scene.add(centralWorld);

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
      // Create bubbles with physics
      topics.forEach((topic, index) => {
        // Skip if bubble is already in exploding animation
        if (topic.isExploding) {
          // Handle exploding bubbles
          const lastKnownBubble = physicsBubblesRef.current[topic.id]?.mesh;
          if (lastKnownBubble) {
            const position = lastKnownBubble.position.clone();
            const size = topic.size === 'lg' ? 1.3 : 
                        topic.size === 'md' ? 1.0 : 0.7;
            const finalSize = size * (1 + topic.reflect_count * 0.1);
            
            createExplosionParticles(position, finalSize * 2);
            
            // Remove the original bubble
            scene.remove(lastKnownBubble);
            delete physicsBubblesRef.current[topic.id];
          }
          return;
        }
        
        const bubbleGroup = new THREE.Group();
        
        // Larger base sizes for better visibility
        const baseSize = topic.size === 'lg' ? 1.3 : 
                        topic.size === 'md' ? 1.0 : 0.7;
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
          expiryRatio, // Store for animation use
          expiryTime // Store actual time
        };

        // Create text labels with enhanced visibility
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
            finalSize * 1.8, // Wider text for better readability
            finalSize * 0.9, 
            1
          );
          
          sprite.position.copy(position);
          return sprite;
        };

        // Position text labels within bubble with better spacing
        bubbleGroup.add(createLabelSprite(
          topic.name, 
          new THREE.Vector3(0, finalSize * 0.4, 0), 
          isMobile ? 38 : 44 // Larger font sizes
        ));
        
        bubbleGroup.add(createLabelSprite(
          topic.topic, 
          new THREE.Vector3(0, -finalSize * 0.1, 0), 
          isMobile ? 32 : 36
        ));
        
        bubbleGroup.add(createLabelSprite(
          `⭐ ${topic.reflect_count}`, 
          new THREE.Vector3(0, -finalSize * 0.5, 0), 
          isMobile ? 28 : 32
        ));
        
        // Add time remaining label
        bubbleGroup.add(createLabelSprite(
          `⏱ ${formatTimeRemaining(expiryTime)}`, 
          new THREE.Vector3(0, -finalSize * 0.85, 0), 
          isMobile ? 26 : 30
        ));

        // Set initial random position with wider and more even distribution
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 6.0 + 4.0; // Wider initial distribution
        const y = (Math.random() - 0.5) * 8.0; // More vertical space
        bubbleGroup.position.set(
          Math.cos(angle) * radius,
          y,
          Math.sin(angle) * radius
        );
        
        scene.add(bubbleGroup);
        
        // Create physics bubble
        const mass = finalSize * 2;
        physicsBubblesRef.current[topic.id] = new PhysicsBubble(
          bubbleGroup, 
          topic.id, 
          mass, 
          finalSize,
          expiryTime,
          centralWorldRef.current
        );
      });
    } else {
      console.log("No topics to render in BubbleWorld");
    }

    // Improved touch handling with adjustments for view movement
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
        
        if (interactionRef.current.isDragging && cameraRef.current) {
          const dx = touch.clientX - interactionRef.current.lastX;
          const dy = touch.clientY - interactionRef.current.lastY;
          
          // Rotate the entire scene for a more immersive navigation
          if (centralWorldRef.current) {
            centralWorldRef.current.rotation.y += dx * 0.008; // Adjusted sensitivity
            centralWorldRef.current.rotation.x += dy * 0.008;
          }
          
          interactionRef.current.momentum = {
            x: dx * 0.008 * 0.8, // Adjusted momentum
            y: dy * 0.008 * 0.8
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

        const bubbleMeshes = Object.values(physicsBubblesRef.current).map(pb => pb.mesh.children[0]);
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
            
            // Apply an impulse to the clicked bubble
            const physBubble = Object.values(physicsBubblesRef.current).find(
              pb => pb.id === parent?.userData.id
            );
            
            if (physBubble) {
              // Apply random impulse for a more dynamic interaction
              const impulse = new THREE.Vector3(
                (Math.random() - 0.5) * 0.05,
                (Math.random() - 0.5) * 0.05,
                (Math.random() - 0.5) * 0.05
              );
              physBubble.velocity.add(impulse);
            }
            
            // Navigate to the BubbleChat page with state to indicate we came from bubbleWorld
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
      if (!interactionRef.current.isInteracting) return;

      const deltaX = Math.abs(e.clientX - interactionRef.current.startX);
      const deltaY = Math.abs(e.clientY - interactionRef.current.startY);
      
      if (deltaX > interactionRef.current.moveThreshold || 
          deltaY > interactionRef.current.moveThreshold) {
        interactionRef.current.isDragging = true;
      }
      
      if (interactionRef.current.isDragging && centralWorldRef.current) {
        const dx = e.clientX - interactionRef.current.lastX;
        const dy = e.clientY - interactionRef.current.lastY;

        // Improve view movement with smoother rotation
        centralWorldRef.current.rotation.y += dx * 0.004; // Adjusted sensitivity for smoother rotation
        centralWorldRef.current.rotation.x += dy * 0.004;

        interactionRef.current.momentum = {
          x: dx * 0.004 * 0.85, // Slightly more momentum retention
          y: dy * 0.00
