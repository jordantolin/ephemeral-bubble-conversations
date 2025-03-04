
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

// Calculate repulsion force between two bubbles
const calculateRepulsionForce = (pos1: THREE.Vector3, pos2: THREE.Vector3, minDistance: number): THREE.Vector3 => {
  const direction = new THREE.Vector3().subVectors(pos1, pos2);
  const distance = direction.length();
  
  // If bubbles are too close, apply repulsion force
  if (distance < minDistance && distance > 0) {
    // Normalize direction and apply force inversely proportional to distance
    direction.normalize();
    
    // Gentler force as bubbles get closer - reduced further for smoother experience
    const forceMagnitude = 0.015 * (1 - distance / minDistance);
    
    // Return the force vector
    return direction.multiplyScalar(forceMagnitude);
  }
  
  // Return zero force if bubbles are far enough apart
  return new THREE.Vector3(0, 0, 0);
};

const BubbleWorld: React.FC<BubbleWorldProps> = ({ topics, onBubbleClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const bubbleGroupsRef = useRef<THREE.Group[]>([]);
  const centralWorld = useRef<THREE.Mesh | null>(null);
  const frameIdRef = useRef<number>(0);
  const navigate = useNavigate();

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Setup scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Setup camera with a gentler perspective
    const camera = new THREE.PerspectiveCamera(
      45, // Slightly reduced FOV for less distortion
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 15;
    cameraRef.current = camera;

    // Add ambient light for better visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    // Add directional light for subtle shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Create a central world object
    const centralWorldGeometry = createCentralWorldGeometry();
    const centralWorldMat = createCentralWorldMaterial();
    const centralWorldMesh = new THREE.Mesh(centralWorldGeometry, centralWorldMat);
    scene.add(centralWorldMesh);
    centralWorld.current = centralWorldMesh;

    // Handle window resize
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Animation loop
    const animate = () => {
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
      
      // Update bubble positions
      updateBubblePositions();
      
      // Update Tween animations
      TWEEN.update();
      
      // Rotate central world very slowly
      if (centralWorld.current) {
        centralWorld.current.rotation.y += 0.001;
        centralWorld.current.rotation.x += 0.0005;
      }
      
      // Render scene
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      
      // Request next frame
      frameIdRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    animate();

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameIdRef.current);
      
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      
      // Dispose of geometries and materials
      bubbleGroupsRef.current.forEach(group => {
        group.traverse(object => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      });
      
      if (centralWorld.current) {
        centralWorld.current.geometry.dispose();
        if (Array.isArray(centralWorld.current.material)) {
          centralWorld.current.material.forEach(material => material.dispose());
        } else {
          centralWorld.current.material.dispose();
        }
      }
    };
  }, []);

  // Create or update bubbles when topics change
  useEffect(() => {
    if (!sceneRef.current) return;
    
    // Remove existing bubbles
    bubbleGroupsRef.current.forEach(group => {
      if (sceneRef.current) {
        sceneRef.current.remove(group);
      }
    });
    bubbleGroupsRef.current = [];
    
    // Create new bubbles based on topics
    const bubbleGroups = topics.map(topic => {
      try {
        // Calculate bubble size based on topic size
        let bubbleSize = 0.8; // Default size
        if (topic.size === "md") bubbleSize = 1.0;
        if (topic.size === "lg") bubbleSize = 1.2;
        
        // Create bubble group
        const group = new THREE.Group();
        
        // Create bubble mesh
        const geometry = createBubbleGeometry(bubbleSize);
        const material = createBubbleMaterial();
        const bubble = new THREE.Mesh(geometry, material);
        
        // Create text sprite
        const topicText = topic.topic.length > 25 
          ? topic.topic.substring(0, 22) + '...' 
          : topic.topic;
        
        const canvas = createTextCanvas(
          topicText,
          Math.max(16, Math.min(24, 18 + (bubbleSize - 0.8) * 10))
        );
        
        const textTexture = new THREE.CanvasTexture(canvas);
        const textMaterial = new THREE.SpriteMaterial({ 
          map: textTexture,
          transparent: true,
          depthTest: false
        });
        
        const textSprite = new THREE.Sprite(textMaterial);
        textSprite.scale.set(bubbleSize * 3, bubbleSize * 1.5, 1);
        textSprite.position.y = -bubbleSize * 1.4;
        
        // Add to group
        group.add(bubble);
        group.add(textSprite);
        
        // Set random initial position, avoiding the central area
        const distance = 4 + Math.random() * 4;
        const angle = Math.random() * Math.PI * 2;
        const elevation = (Math.random() - 0.5) * Math.PI;
        
        group.position.set(
          distance * Math.cos(angle) * Math.cos(elevation),
          distance * Math.sin(elevation),
          distance * Math.sin(angle) * Math.cos(elevation)
        );
        
        // Store metadata in userData for later use
        group.userData = {
          id: topic.id,
          size: bubbleSize,
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.01,
            (Math.random() - 0.5) * 0.01,
            (Math.random() - 0.5) * 0.01
          ),
          acceleration: new THREE.Vector3(0, 0, 0),
          // Gentler movement parameters for smoother experience
          maxSpeed: 0.02,
          damping: 0.98,
          minDistance: bubbleSize * 2.5, // Ensure text doesn't overlap
          lastUpdate: Date.now(),
          expiryTime: topic.expires_at ? new Date(topic.expires_at) : null,
          textSprite: textSprite,
        };
        
        // Make interactive
        group.userData.onClick = () => {
          onBubbleClick(topic.id);
        };
        
        if (sceneRef.current) {
          sceneRef.current.add(group);
        }
        
        return group;
      } catch (error) {
        console.error("Error creating bubble:", error);
        return new THREE.Group(); // Return empty group on error
      }
    });
    
    bubbleGroupsRef.current = bubbleGroups;
    
    // Add click event listener
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;
      
      // Calculate mouse position in normalized device coordinates
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Raycasting to detect clicks on bubbles
      const raycaster = new THREE.Raycaster();
      // Convert to THREE.Vector2 for the raycaster
      raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
      
      // Check for intersections with bubble groups
      const intersects = raycaster.intersectObjects(
        bubbleGroupsRef.current.flatMap(group => group.children),
        true
      );
      
      if (intersects.length > 0) {
        // Find the parent group of the intersected object
        let bubbleGroup: THREE.Object3D | null = intersects[0].object;
        while (bubbleGroup && !(bubbleGroup instanceof THREE.Group)) {
          bubbleGroup = bubbleGroup.parent;
        }
        
        // Trigger click handler if found
        if (bubbleGroup && bubbleGroup.userData && bubbleGroup.userData.onClick) {
          bubbleGroup.userData.onClick();
        }
      }
    };
    
    containerRef.current?.addEventListener('click', handleClick);
    
    return () => {
      containerRef.current?.removeEventListener('click', handleClick);
    };
  }, [topics, onBubbleClick]);

  // Update bubble positions with collision detection and forces
  const updateBubblePositions = () => {
    const now = Date.now();
    const groups = bubbleGroupsRef.current;
    
    // Calculate forces between all pairs of bubbles
    for (let i = 0; i < groups.length; i++) {
      const groupA = groups[i];
      
      // Clear acceleration for this update
      groupA.userData.acceleration.set(0, 0, 0);
      
      // Calculate repulsion forces with central world
      if (centralWorld.current) {
        const direction = new THREE.Vector3().subVectors(
          groupA.position,
          centralWorld.current.position
        );
        const distance = direction.length();
        
        const centralRepulsionDistance = 2 + groupA.userData.size;
        if (distance < centralRepulsionDistance && distance > 0) {
          direction.normalize();
          const forceMagnitude = 0.02 * (1 - distance / centralRepulsionDistance);
          const force = direction.clone().multiplyScalar(forceMagnitude);
          groupA.userData.acceleration.add(force);
        }
      }
      
      // Calculate repulsion forces between bubbles
      for (let j = i + 1; j < groups.length; j++) {
        const groupB = groups[j];
        
        // Calculate minimum separation distance based on both bubble sizes plus a margin
        const minDistance = groupA.userData.minDistance + groupB.userData.minDistance;
        
        // Calculate repulsion force between these two bubbles
        const forceA = calculateRepulsionForce(
          groupA.position,
          groupB.position,
          minDistance
        );
        
        // Apply force to acceleration (opposite for the second bubble)
        groupA.userData.acceleration.add(forceA);
        groupB.userData.acceleration.sub(forceA);
      }
    }
    
    // Update velocities and positions
    for (const group of groups) {
      // Update velocity based on acceleration
      group.userData.velocity.add(group.userData.acceleration);
      
      // Apply damping to gradually slow down
      group.userData.velocity.multiplyScalar(group.userData.damping);
      
      // Limit maximum speed for stability
      const speed = group.userData.velocity.length();
      if (speed > group.userData.maxSpeed) {
        group.userData.velocity.multiplyScalar(group.userData.maxSpeed / speed);
      }
      
      // Update position based on velocity
      group.position.add(group.userData.velocity);
      
      // Ensure bubbles don't drift too far
      const distance = group.position.length();
      const maxDistance = 12;
      if (distance > maxDistance) {
        const force = group.position.clone().normalize().multiplyScalar(-0.01);
        group.userData.velocity.add(force);
      }
      
      // Make sure text sprite always faces the camera
      if (group.userData.textSprite && cameraRef.current) {
        group.userData.textSprite.lookAt(cameraRef.current.position);
      }
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full absolute top-0 left-0 -z-10"
      style={{ pointerEvents: 'auto' }}
    />
  );
};

export default BubbleWorld;
