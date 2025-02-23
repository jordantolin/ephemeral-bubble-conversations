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

    // Enhanced camera setup with better constraints
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 15;
    camera.position.y = 2; // Slightly elevated default view

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      logarithmicDepthBuffer: true // Better depth handling
    });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    containerRef.current.appendChild(renderer.domElement);

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // Create planet with enhanced material for better depth perception
    const planetGeometry = new THREE.SphereGeometry(6, 128, 128);
    const planetMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xFFFFFF,
      roughness: 0.4,
      metalness: 0.1,
      clearcoat: 0.3,
      transmission: 0.05,
      ior: 1.2,
      depthWrite: true,
      depthTest: true
    });
    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
    scene.add(planet);

    // Enhanced lighting for better depth perception
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0xFFFAF0, 0xFFF5E6, 0.8);
    scene.add(hemisphereLight);

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
    const bubbleGeometries = {
      sm: new THREE.CircleGeometry(0.8, 32),
      md: new THREE.CircleGeometry(1, 32),
      lg: new THREE.CircleGeometry(1.2, 32),
    };

    topics.forEach((topic, index) => {
      const bubbleTexture = createBubbleText(topic.topic, topic.username, topic.name);
      
      // Enhanced material with proper depth handling
      const bubbleMaterial = new THREE.MeshBasicMaterial({
        map: bubbleTexture,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide,
        depthWrite: false, // Prevents bubbles from affecting depth buffer
        depthTest: true,   // Still tests against depth buffer
      });

      const bubble = new THREE.Mesh(bubbleGeometries[topic.size], bubbleMaterial);
      
      // Position bubbles with increased offset from surface
      const baseRadius = 7; // Increased distance from surface
      const phi = Math.acos(-1 + (2 * index) / topics.length);
      const theta = Math.sqrt(topics.length * Math.PI) * phi;
      
      bubble.position.setFromSpherical(new THREE.Spherical(baseRadius, phi, theta));
      
      // Enhanced movement parameters
      bubble.userData = {
        id: topic.id,
        orbitSpeed: 0.00015 + Math.random() * 0.0001,
        baseRadius: baseRadius,
        floatAmplitude: 0.3 + Math.random() * 0.2,    // Increased floating range
        floatSpeed: 0.0008 + Math.random() * 0.0004,  // Adjusted for smoother movement
        orbitOffset: Math.random() * Math.PI * 2,
        originalScale: topic.size === 'lg' ? 1.2 : topic.size === 'md' ? 1 : 0.8,
        phase: Math.random() * Math.PI * 2,
        verticalOffset: Math.random() * Math.PI * 2,   // Additional offset for vertical movement
      };
      
      scene.add(bubble);
      bubbles.push(bubble);
    });

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let rotationSpeed = { x: 0, y: 0 };
    const dampingFactor = 0.95;
    let momentum = { x: 0, y: 0 };

    // Enhanced camera controls
    const minZoom = 10; // Increased minimum zoom to prevent clipping
    const maxZoom = 20;
    const minPolarAngle = Math.PI * 0.15; // Limit vertical rotation
    const maxPolarAngle = Math.PI * 0.85;
    let currentRotation = { x: 0, y: 0 };

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
      momentum.x = rotationSpeed.x;
      momentum.y = rotationSpeed.y;
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

    const handleWheel = (event: WheelEvent) => {
      const zoomSpeed = 0.001;
      const newZoom = camera.position.z + event.deltaY * zoomSpeed;
      camera.position.z = Math.max(minZoom, Math.min(maxZoom, newZoom));

      // Enhanced bubble scaling based on zoom
      const zoomFactor = (camera.position.z - minZoom) / (maxZoom - minZoom);
      bubbles.forEach((bubble) => {
        const baseScale = bubble.userData.originalScale;
        const scale = baseScale * (1 + (1 - zoomFactor) * 0.5);
        bubble.scale.setScalar(scale);
      });
    };

    containerRef.current.addEventListener('wheel', handleWheel);

    // Enhanced animation with improved movement
    const animate = () => {
      requestAnimationFrame(animate);

      if (!isDragging) {
        // Apply momentum with damping
        momentum.x *= dampingFactor;
        momentum.y *= dampingFactor;
        rotationSpeed.x = momentum.x;
        rotationSpeed.y = momentum.y;

        // Continue rotation with momentum
        currentRotation.x += rotationSpeed.x;
        currentRotation.y += rotationSpeed.y;

        // Apply rotation limits
        currentRotation.x = Math.max(minPolarAngle - Math.PI/2, 
                                   Math.min(maxPolarAngle - Math.PI/2, 
                                   currentRotation.x));
      }

      // Smooth planet rotation
      planet.rotation.y += 0.001;

      bubbles.forEach((bubble) => {
        const time = Date.now();
        const baseRadius = bubble.userData.baseRadius;
        
        // Enhanced floating movement
        const floatOffset = Math.sin(time * bubble.userData.floatSpeed + bubble.userData.phase) * 
                          bubble.userData.floatAmplitude;
        
        // Calculate complex orbital movement
        const orbitAngle = time * bubble.userData.orbitSpeed + bubble.userData.orbitOffset;
        
        // Keep bubbles at constant radius from center but allow floating
        const radius = baseRadius + floatOffset;
        
        // Calculate position with enhanced movement
        const phi = Math.acos(-1 + (2 * bubbles.indexOf(bubble)) / bubbles.length);
        const theta = Math.sqrt(bubbles.length * Math.PI) * phi + orbitAngle;
        
        // Convert spherical coordinates to Cartesian
        bubble.position.setFromSpherical(new THREE.Spherical(
          radius,
          phi + Math.sin(time * bubble.userData.floatSpeed * 0.5 + bubble.userData.verticalOffset) * 0.1,
          theta
        ));
        
        // Apply world rotation while maintaining proper depth
        bubble.position.applyAxisAngle(new THREE.Vector3(1, 0, 0), rotationSpeed.x);
        bubble.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationSpeed.y);
        
        // Ensure bubbles always face camera
        bubble.quaternion.copy(camera.quaternion);
      });

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
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
