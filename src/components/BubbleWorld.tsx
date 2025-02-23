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

    // Create planet
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

    // Enhanced lighting
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1.5);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0xFFFAF0, 0xFFF5E6, 1);
    scene.add(hemisphereLight);

    const mainLight = new THREE.DirectionalLight(0xFFFFFF, 1.5);
    mainLight.position.set(1, 1, 1);
    scene.add(mainLight);

    // Create text texture for bubbles
    const createBubbleText = (topic: string, username: string, name: string) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return null;

      canvas.width = 512;
      canvas.height = 512;
      
      // Create circular gradient with stronger yellow
      const gradient = context.createRadialGradient(
        canvas.width/2, canvas.height/2, 0,
        canvas.width/2, canvas.height/2, canvas.width/2
      );
      gradient.addColorStop(0, 'rgba(255, 214, 0, 1)');      // Vibrant yellow core
      gradient.addColorStop(0.7, 'rgba(255, 198, 0, 0.98)'); // Strong yellow edge
      gradient.addColorStop(1, 'rgba(255, 198, 0, 0.95)');   // Slight fade at the very edge
      
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(canvas.width/2, canvas.height/2, canvas.width/2, 0, Math.PI * 2);
      context.fill();

      // Draw text with better contrast
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      
      // Bolder text with shadow for better readability
      const shadowColor = 'rgba(0, 0, 0, 0.2)';
      context.shadowColor = shadowColor;
      context.shadowBlur = 4;
      
      context.font = 'bold 56px Inter';
      context.fillStyle = 'rgba(0, 0, 0, 0.9)';
      context.fillText(topic, canvas.width/2, canvas.height/2 - 60);
      
      context.font = 'bold 40px Inter';
      context.fillStyle = 'rgba(0, 0, 0, 0.85)';
      context.fillText(username, canvas.width/2, canvas.height/2 + 20);
      
      context.font = '36px Inter';
      context.fillStyle = 'rgba(0, 0, 0, 0.8)';
      context.fillText(name, canvas.width/2, canvas.height/2 + 80);

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      
      return texture;
    };

    const bubbles: THREE.Mesh[] = [];
    // Use CircleGeometry for 2D bubbles
    const bubbleGeometries = {
      sm: new THREE.CircleGeometry(0.8, 32),
      md: new THREE.CircleGeometry(1, 32),
      lg: new THREE.CircleGeometry(1.2, 32),
    };

    topics.forEach((topic, index) => {
      const bubbleTexture = createBubbleText(topic.topic, topic.username, topic.name);
      
      // Enhanced material with stronger yellow
      const bubbleMaterial = new THREE.MeshBasicMaterial({
        map: bubbleTexture,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide,
        depthWrite: true,
      });

      const bubble = new THREE.Mesh(bubbleGeometries[topic.size], bubbleMaterial);
      
      // Position bubbles slightly above surface
      const baseRadius = 6.5; // Increased base radius to float above surface
      const phi = Math.acos(-1 + (2 * index) / topics.length);
      const theta = Math.sqrt(topics.length * Math.PI) * phi;
      
      bubble.position.setFromSpherical(new THREE.Spherical(baseRadius, phi, theta));
      
      // Enhanced movement parameters
      bubble.userData = {
        id: topic.id,
        orbitSpeed: 0.00015 + Math.random() * 0.0001,
        baseRadius: baseRadius,
        floatAmplitude: 0.2 + Math.random() * 0.1, // Random floating height
        floatSpeed: 0.001 + Math.random() * 0.0005, // Random floating speed
        orbitOffset: Math.random() * Math.PI * 2,
        originalScale: topic.size === 'lg' ? 1.2 : topic.size === 'md' ? 1 : 0.8,
        phase: Math.random() * Math.PI * 2, // Random phase for varied movement
      };
      
      scene.add(bubble);
      bubbles.push(bubble);
    });

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let rotationSpeed = { x: 0, y: 0 };
    const dampingFactor = 0.95;

    // Event handlers
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

    // Enhanced camera controls
    camera.position.z = 15;
    const minZoom = 8;
    const maxZoom = 20;
    
    // Enhanced zoom handling
    const handleWheel = (event: WheelEvent) => {
      const zoomSpeed = 0.001;
      const newZoom = camera.position.z + event.deltaY * zoomSpeed;
      camera.position.z = Math.max(minZoom, Math.min(maxZoom, newZoom));

      // Dynamic bubble scaling based on zoom
      const zoomFactor = (camera.position.z - minZoom) / (maxZoom - minZoom);
      bubbles.forEach((bubble) => {
        const baseScale = bubble.userData.originalScale;
        const scale = baseScale * (1 + (1 - zoomFactor) * 0.8); // More pronounced scaling
        bubble.scale.setScalar(scale);
      });
    };

    containerRef.current.addEventListener('wheel', handleWheel);

    // Enhanced animation with more dynamic movement
    const animate = () => {
      requestAnimationFrame(animate);

      if (!isDragging) {
        rotationSpeed.x *= dampingFactor;
        rotationSpeed.y *= dampingFactor;
      }

      planet.rotation.y += 0.001;

      bubbles.forEach((bubble) => {
        const time = Date.now();
        const baseRadius = bubble.userData.baseRadius;
        
        // Complex floating movement
        const floatOffset = Math.sin(time * bubble.userData.floatSpeed + bubble.userData.phase) * 
                          bubble.userData.floatAmplitude;
        
        // Calculate position with enhanced movement
        const orbitAngle = time * bubble.userData.orbitSpeed + bubble.userData.orbitOffset;
        const radius = baseRadius + floatOffset;
        
        // Update position with more natural movement
        bubble.position.x = Math.cos(orbitAngle) * Math.sin(bubble.userData.phase) * radius;
        bubble.position.z = Math.sin(orbitAngle) * Math.sin(bubble.userData.phase) * radius;
        bubble.position.y = Math.cos(bubble.userData.phase) * radius + 
                          Math.sin(time * bubble.userData.floatSpeed * 0.5) * 0.1;
        
        // Apply world rotation with smooth damping
        bubble.position.applyAxisAngle(new THREE.Vector3(1, 0, 0), rotationSpeed.x);
        bubble.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationSpeed.y);
        
        // Always face camera
        bubble.quaternion.copy(camera.quaternion);
      });

      renderer.render(scene, camera);
    };

    // Cleanup
    return () => {
      window.removeEventListener('resize', () => {});
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
