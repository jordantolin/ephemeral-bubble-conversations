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
    camera.position.z = 15;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);

    // Create planet with subtle rotation
    const planetGeometry = new THREE.SphereGeometry(6, 128, 128);
    const planet = new THREE.Mesh(
      planetGeometry,
      new THREE.MeshPhysicalMaterial({
        color: 0xFFFFFF,
        roughness: 0.4,
        metalness: 0.1,
        clearcoat: 0.3,
        transmission: 0.05,
        ior: 1.2,
      })
    );
    scene.add(planet);

    // Enhanced lighting for better bubble visibility
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1.5);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0xFFFAF0, 0xFFF5E6, 1);
    scene.add(hemisphereLight);

    const mainLight = new THREE.DirectionalLight(0xFFFFFF, 1.5);
    mainLight.position.set(1, 1, 1);
    scene.add(mainLight);

    // Create text texture for bubbles with better contrast
    const createBubbleText = (topic: string, username: string, name: string) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return null;

      canvas.width = 512; // Increased for better text quality
      canvas.height = 512;
      
      // Create stronger yellow gradient background
      const gradient = context.createRadialGradient(
        canvas.width/2, canvas.height/2, 0,
        canvas.width/2, canvas.height/2, canvas.width/2
      );
      gradient.addColorStop(0, 'rgba(255, 233, 125, 0.95)'); // More vibrant yellow
      gradient.addColorStop(1, 'rgba(255, 233, 125, 0.85)');
      
      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);

      // Draw text with better contrast
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      
      // Topic (largest and bolder)
      context.font = 'bold 56px Inter';
      context.fillStyle = 'rgba(0, 0, 0, 0.9)'; // Darker text
      context.fillText(topic, canvas.width/2, canvas.height/2 - 60);
      
      // Username
      context.font = 'bold 40px Inter';
      context.fillStyle = 'rgba(0, 0, 0, 0.85)';
      context.fillText(username, canvas.width/2, canvas.height/2 + 20);
      
      // Bubble name
      context.font = '36px Inter';
      context.fillStyle = 'rgba(0, 0, 0, 0.8)';
      context.fillText(name, canvas.width/2, canvas.height/2 + 80);

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      
      return texture;
    };

    const bubbles: THREE.Mesh[] = [];
    const bubbleGeometries = {
      sm: new THREE.SphereGeometry(0.8, 64, 64),
      md: new THREE.SphereGeometry(1, 64, 64),
      lg: new THREE.SphereGeometry(1.2, 64, 64),
    };

    topics.forEach((topic, index) => {
      const bubbleTexture = createBubbleText(topic.topic, topic.username, topic.name);
      
      // Enhanced yellow bubble material with less transparency
      const bubbleMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xFFE066, // Brighter yellow
        emissive: 0xFFF3B0,
        emissiveIntensity: 0.4,
        roughness: 0.1,
        metalness: 0.2,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        transmission: 0.2, // Less transmission for more opacity
        transparent: true,
        opacity: 0.95, // Higher opacity
        map: bubbleTexture,
      });

      const bubble = new THREE.Mesh(bubbleGeometries[topic.size], bubbleMaterial);
      
      // Random initial position in a sphere around the center
      const radius = 7 + Math.random() * 2; // Varying distances
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.random() * Math.PI;
      
      bubble.position.setFromSpherical(new THREE.Spherical(radius, phi, theta));
      
      // Store movement parameters
      bubble.userData = {
        id: topic.id,
        orbitSpeed: 0.0002 + Math.random() * 0.0003,
        orbitRadius: radius,
        orbitOffset: Math.random() * Math.PI * 2,
        verticalOffset: Math.random() * Math.PI * 2,
        horizontalOffset: Math.random() * Math.PI * 2,
        originalScale: topic.size === 'lg' ? 1.2 : topic.size === 'md' ? 1 : 0.8,
      };
      
      scene.add(bubble);
      bubbles.push(bubble);
    });

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

    const onClick = (event: MouseEvent | TouchEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

      const mouse = new THREE.Vector2();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(bubbles);

      if (intersects.length > 0) {
        const bubbleId = intersects[0].object.userData.id;
        onBubbleClick(bubbleId);
      }
    };

    containerRef.current.addEventListener('mousedown', onPointerDown);
    containerRef.current.addEventListener('touchstart', onPointerDown);
    containerRef.current.addEventListener('mousemove', onPointerMove);
    containerRef.current.addEventListener('touchmove', onPointerMove);
    containerRef.current.addEventListener('mouseup', onPointerUp);
    containerRef.current.addEventListener('touchend', onPointerUp);
    containerRef.current.addEventListener('click', onClick);
    containerRef.current.addEventListener('touchstart', onClick);

    // Enhanced zoom handling
    const handleWheel = (event: WheelEvent) => {
      const zoomSpeed = 0.001;
      const newZoom = camera.position.z + event.deltaY * zoomSpeed;
      camera.position.z = Math.max(8, Math.min(20, newZoom));

      // Scale bubbles based on zoom level
      const zoomFactor = (camera.position.z - 8) / 12; // 0 when closest, 1 when farthest
      bubbles.forEach((bubble) => {
        const baseScale = bubble.userData.originalScale;
        const scale = baseScale * (1 + (1 - zoomFactor) * 0.5); // Bigger when closer
        bubble.scale.setScalar(scale);
      });
    };

    containerRef.current.addEventListener('wheel', handleWheel);

    // Animation loop with more dynamic movement
    const animate = () => {
      requestAnimationFrame(animate);

      if (!isDragging) {
        rotationSpeed.x *= dampingFactor;
        rotationSpeed.y *= dampingFactor;
      }

      planet.rotation.y += 0.001;

      bubbles.forEach((bubble) => {
        const time = Date.now() * bubble.userData.orbitSpeed;
        const radius = bubble.userData.orbitRadius;
        
        // More complex orbital movement
        bubble.position.x = Math.cos(time + bubble.userData.horizontalOffset) * radius;
        bubble.position.z = Math.sin(time + bubble.userData.horizontalOffset) * radius;
        bubble.position.y = Math.sin(time * 0.5 + bubble.userData.verticalOffset) * (radius * 0.2);
        
        // Apply world rotation
        bubble.position.applyAxisAngle(new THREE.Vector3(1, 0, 0), rotationSpeed.x);
        bubble.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationSpeed.y);
        
        // Make bubble always face camera
        bubble.quaternion.copy(camera.quaternion);
      });

      renderer.render(scene, camera);
    };

    animate();

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
