import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface BubbleWorldProps {
  topics: Array<{
    id: string;
    topic: string;
    username: string;
    name: string;
    size: "sm" | "md" | "lg";
  }>;
  onBubbleClick: (id: string) => void;
}

const BubbleWorld = ({ topics, onBubbleClick }: BubbleWorldProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    bubbles: THREE.Mesh[];
    planet: THREE.Mesh;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
  }>();
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#FEF7E4');

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 15; // Moved camera closer

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);

    // Create planet with subtle rotation
    const planetGeometry = new THREE.SphereGeometry(6, 128, 128); // Made planet slightly smaller
    const planetMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xFFFFFF,
      roughness: 0.4,
      metalness: 0.1,
      clearcoat: 0.3,
      transmission: 0.05,
      ior: 1.2,
    });
    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
    scene.add(planet);

    // Enhanced lighting for better 3D effect
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1.2);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0xFFFAF0, 0xFFF5E6, 0.8);
    scene.add(hemisphereLight);

    const mainLight = new THREE.DirectionalLight(0xFFFFFF, 1.2);
    mainLight.position.set(1, 1, 1);
    scene.add(mainLight);

    // Enhanced bubble text creation with better visibility
    const createBubbleText = (topic: string, username: string, name: string) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return null;

      canvas.width = 512; // Increased for better quality
      canvas.height = 512;
      
      // Create subtle background glow
      const gradient = context.createRadialGradient(
        canvas.width/2, canvas.height/2, 0,
        canvas.width/2, canvas.height/2, canvas.width/4
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);

      // Center all text
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      
      // Draw topic name (largest and boldest)
      context.font = 'bold 48px Inter';
      context.fillStyle = 'rgba(0, 0, 0, 0.8)';
      context.fillText(topic, canvas.width/2, canvas.height/2 - 40);
      
      // Draw username
      context.font = '32px Inter';
      context.fillStyle = 'rgba(0, 0, 0, 0.6)';
      context.fillText(username, canvas.width/2, canvas.height/2 + 20);
      
      // Draw bubble name
      context.font = '28px Inter';
      context.fillStyle = 'rgba(0, 0, 0, 0.5)';
      context.fillText(name, canvas.width/2, canvas.height/2 + 70);

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      
      return new THREE.Sprite(new THREE.SpriteMaterial({ 
        map: texture,
        transparent: true,
        opacity: 0.95, // Slightly increased opacity
      }));
    };

    const bubbles: THREE.Mesh[] = [];
    const bubbleGeometries = {
      sm: new THREE.SphereGeometry(0.8, 64, 64), // Made bubbles slightly smaller
      md: new THREE.SphereGeometry(1, 64, 64),
      lg: new THREE.SphereGeometry(1.2, 64, 64),
    };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    sceneRef.current = { scene, camera, renderer, bubbles, planet, raycaster, mouse };

    topics.forEach((topic, index) => {
      const bubbleMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffd700,
        emissive: 0xffeb3b,
        emissiveIntensity: 0.2,
        roughness: 0.2,
        metalness: 0.1,
        clearcoat: 0.8,
        clearcoatRoughness: 0.2,
        transmission: 0.4,
        transparent: true,
        opacity: 0.85,
      });

      const bubble = new THREE.Mesh(bubbleGeometries[topic.size], bubbleMaterial);
      
      // Position bubbles closer to the planet surface
      const radius = 8; // Closer orbit radius
      const phi = Math.acos(-1 + (2 * index) / topics.length);
      const theta = Math.sqrt(topics.length * Math.PI) * phi;
      
      bubble.position.setFromSpherical(new THREE.Spherical(radius, phi, theta));
      bubble.userData.id = topic.id;
      bubble.userData.orbitSpeed = 0.0003 + Math.random() * 0.0002; // Individual orbit speed
      bubble.userData.orbitRadius = radius;
      bubble.userData.orbitOffset = Math.random() * Math.PI * 2; // Random starting position
      
      const label = createBubbleText(topic.topic, topic.username, topic.name);
      if (label) {
        label.scale.set(2, 2, 1);
        label.position.copy(bubble.position);
        scene.add(label);
        bubble.userData.label = label;
      }
      
      scene.add(bubble);
      bubbles.push(bubble);
    });

    // Enhanced interaction controls
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let rotationSpeed = { x: 0, y: 0 };
    const dampingFactor = 0.95;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      isDragging = true;
      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
      previousMousePosition = { x: clientX, y: clientY };
    };

    const onPointerMove = (event: MouseEvent | TouchEvent) => {
      if (!isDragging) return;

      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

      const deltaMove = {
        x: clientX - previousMousePosition.x,
        y: clientY - previousMousePosition.y,
      };

      rotationSpeed.x = deltaMove.y * 0.002;
      rotationSpeed.y = deltaMove.x * 0.002;

      previousMousePosition = { x: clientX, y: clientY };
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    // Handle clicks and touches
    const onClick = (event: MouseEvent | TouchEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(bubbles);

      if (intersects.length > 0) {
        const bubbleId = intersects[0].object.userData.id;
        onBubbleClick(bubbleId);
      }
    };

    // Add event listeners
    containerRef.current.addEventListener('mousedown', onPointerDown);
    containerRef.current.addEventListener('touchstart', onPointerDown);
    containerRef.current.addEventListener('mousemove', onPointerMove);
    containerRef.current.addEventListener('touchmove', onPointerMove);
    containerRef.current.addEventListener('mouseup', onPointerUp);
    containerRef.current.addEventListener('touchend', onPointerUp);
    containerRef.current.addEventListener('click', onClick);
    containerRef.current.addEventListener('touchstart', onClick);

    // Zoom handling
    const handleWheel = (event: WheelEvent) => {
      camera.position.z = Math.max(
        12,
        Math.min(24, camera.position.z + event.deltaY * 0.01)
      );
    };

    containerRef.current.addEventListener('wheel', handleWheel);

    // Animation loop with smooth orbiting
    const animate = () => {
      requestAnimationFrame(animate);

      if (!isDragging) {
        rotationSpeed.x *= dampingFactor;
        rotationSpeed.y *= dampingFactor;
      }

      planet.rotation.y += 0.001;

      // Update bubble positions with smooth orbiting
      bubbles.forEach((bubble) => {
        const time = Date.now() * bubble.userData.orbitSpeed;
        const orbitOffset = bubble.userData.orbitOffset;
        const radius = bubble.userData.orbitRadius;
        
        // Calculate new position in orbit
        bubble.position.x = Math.cos(time + orbitOffset) * radius;
        bubble.position.z = Math.sin(time + orbitOffset) * radius;
        bubble.position.y = Math.sin(time * 2) * 0.2; // Gentle up/down movement
        
        // Apply world rotation
        bubble.position.applyAxisAngle(new THREE.Vector3(1, 0, 0), rotationSpeed.x);
        bubble.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationSpeed.y);
        
        // Update label position
        const label = bubble.userData.label;
        if (label) {
          label.position.copy(bubble.position);
          label.position.y += 0.2;
        }
      });

      renderer.render(scene, camera);
    };

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) {
        containerRef.current.removeEventListener('mousedown', onPointerDown);
        containerRef.current.removeEventListener('touchstart', onPointerDown);
        containerRef.current.removeEventListener('mousemove', onPointerMove);
        containerRef.current.removeEventListener('touchmove', onPointerMove);
        containerRef.current.removeEventListener('mouseup', onPointerUp);
        containerRef.current.removeEventListener('touchend', onPointerUp);
        containerRef.current.removeEventListener('click', onClick);
        containerRef.current.removeEventListener('touchstart', onClick);
        containerRef.current.removeEventListener('wheel', handleWheel);
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [topics, onBubbleClick]);

  return <div ref={containerRef} className="absolute inset-0" />;
};

export default BubbleWorld;
