import { useEffect, useRef, useState } from 'react';
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
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    bubbles: THREE.Mesh[];
    worldGroup: THREE.Group;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
  }>();

  const controlsRef = useRef({
    isDragging: false,
    lastTouch: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    rotation: { x: 0, y: 0 },
  });

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#FEF7E4');

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Camera setup with mobile-optimized parameters
    const camera = new THREE.PerspectiveCamera(
      window.innerWidth < 768 ? 70 : 60,
      width / height,
      0.1,
      1000
    );
    camera.position.z = window.innerWidth < 768 ? 12 : 15;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);

    // World group setup
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // Planet setup
    const planetGeometry = new THREE.SphereGeometry(5, 64, 64);
    const planetMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xF5F5F5,
      roughness: 0.7,
      metalness: 0.1,
      clearcoat: 0.4,
    });
    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
    worldGroup.add(planet);

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1.2);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Raycaster for bubble interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Create bubbles
    const bubbles: THREE.Mesh[] = [];
    topics.forEach((topic, index) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return;

      // Enhanced bubble texture
      canvas.width = 512;
      canvas.height = 512;
      
      const gradient = context.createRadialGradient(
        canvas.width/2, canvas.height/2, 0,
        canvas.width/2, canvas.height/2, canvas.width/2
      );
      gradient.addColorStop(0, 'rgba(255, 223, 0, 0.95)');
      gradient.addColorStop(0.7, 'rgba(255, 214, 0, 0.9)');
      gradient.addColorStop(1, 'rgba(255, 198, 0, 0.85)');
      
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(canvas.width/2, canvas.height/2, canvas.width/2, 0, Math.PI * 2);
      context.fill();

      // Enhanced text rendering
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.shadowColor = 'rgba(0, 0, 0, 0.2)';
      context.shadowBlur = 4;
      
      context.font = 'bold 56px Inter';
      context.fillStyle = 'rgba(0, 0, 0, 0.9)';
      context.fillText(topic.topic, canvas.width/2, canvas.height/2 - 60);
      
      context.font = 'bold 40px Inter';
      context.fillStyle = 'rgba(0, 0, 0, 0.85)';
      context.fillText(topic.username, canvas.width/2, canvas.height/2 + 20);
      
      context.font = '36px Inter';
      context.fillStyle = 'rgba(0, 0, 0, 0.8)';
      context.fillText(topic.name, canvas.width/2, canvas.height/2 + 80);

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      // Create bubble mesh
      const size = topic.size === 'lg' ? 1.4 : topic.size === 'md' ? 1.2 : 1;
      const bubbleGeometry = new THREE.CircleGeometry(size, 32);
      const bubbleMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        depthTest: true,
      });

      const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
      
      // Position bubbles in a fibonacci sphere
      const phi = Math.acos(-1 + (2 * index) / topics.length);
      const theta = Math.sqrt(topics.length * Math.PI) * phi;
      
      const radius = 8;
      bubble.position.setFromSpherical(new THREE.Spherical(
        radius,
        phi,
        theta
      ));

      bubble.userData = {
        id: topic.id,
        originalPosition: bubble.position.clone(),
        floatSpeed: 0.0008 + Math.random() * 0.0004,
        floatAmplitude: 0.1 + Math.random() * 0.05,
        rotationOffset: Math.random() * Math.PI * 2,
        size,
      };

      worldGroup.add(bubble);
      bubbles.push(bubble);
    });

    // Touch and mouse interaction
    const handleStart = (x: number, y: number) => {
      controlsRef.current.isDragging = true;
      controlsRef.current.lastTouch = { x, y };
      controlsRef.current.velocity = { x: 0, y: 0 };
    };

    const handleMove = (x: number, y: number) => {
      if (!controlsRef.current.isDragging) return;

      const deltaX = x - controlsRef.current.lastTouch.x;
      const deltaY = y - controlsRef.current.lastTouch.y;

      const sensitivity = window.innerWidth < 768 ? 0.004 : 0.002;
      worldGroup.rotation.y += deltaX * sensitivity;
      worldGroup.rotation.x += deltaY * sensitivity;

      // Limit vertical rotation
      worldGroup.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, worldGroup.rotation.x));

      controlsRef.current.lastTouch = { x, y };
      controlsRef.current.velocity = {
        x: deltaX * sensitivity * 0.1,
        y: deltaY * sensitivity * 0.1,
      };
    };

    const handleEnd = () => {
      controlsRef.current.isDragging = false;
    };

    // Touch events
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      handleEnd();
    };

    // Mouse events
    const onMouseDown = (e: MouseEvent) => {
      handleStart(e.clientX, e.clientY);
    };

    const onMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);

      // Update mouse position for raycasting
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onMouseUp = () => {
      handleEnd();
    };

    // Click/tap handler
    const handleClick = (e: MouseEvent | TouchEvent) => {
      const coords = 'touches' in e ? e.touches[0] : e;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((coords.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((coords.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(bubbles);

      if (intersects.length > 0) {
        const bubble = intersects[0].object;
        const id = bubble.userData.id;
        setSelectedBubbleId(id);
        onBubbleClick(id);
      }
    };

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      const time = Date.now() * 0.001;

      // Update bubbles
      bubbles.forEach((bubble) => {
        const { floatSpeed, floatAmplitude, rotationOffset, originalPosition } = bubble.userData;
        
        // Floating animation
        const floatOffset = Math.sin(time * floatSpeed + rotationOffset) * floatAmplitude;
        bubble.position.y = originalPosition.y + floatOffset;

        // Keep bubbles facing camera
        bubble.quaternion.copy(camera.quaternion);

        // Scale effect for selected bubble
        const isSelected = bubble.userData.id === selectedBubbleId;
        const targetScale = isSelected ? bubble.userData.size * 1.2 : bubble.userData.size;
        bubble.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      });

      // Apply momentum
      if (!controlsRef.current.isDragging) {
        worldGroup.rotation.x += controlsRef.current.velocity.y;
        worldGroup.rotation.y += controlsRef.current.velocity.x;
        
        controlsRef.current.velocity.x *= 0.95;
        controlsRef.current.velocity.y *= 0.95;
      }

      renderer.render(scene, camera);
    };

    // Event listeners
    containerRef.current.addEventListener('touchstart', onTouchStart, { passive: false });
    containerRef.current.addEventListener('touchmove', onTouchMove, { passive: false });
    containerRef.current.addEventListener('touchend', onTouchEnd);
    containerRef.current.addEventListener('mousedown', onMouseDown);
    containerRef.current.addEventListener('mousemove', onMouseMove);
    containerRef.current.addEventListener('mouseup', onMouseUp);
    containerRef.current.addEventListener('click', handleClick);

    // Window resize handler
    const handleResize = () => {
      if (!containerRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Store references
    sceneRef.current = {
      scene,
      camera,
      renderer,
      bubbles,
      worldGroup,
      raycaster,
      mouse,
    };

    // Start animation
    animate();

    // Cleanup
    return () => {
      containerRef.current?.removeEventListener('touchstart', onTouchStart);
      containerRef.current?.removeEventListener('touchmove', onTouchMove);
      containerRef.current?.removeEventListener('touchend', onTouchEnd);
      containerRef.current?.removeEventListener('mousedown', onMouseDown);
      containerRef.current?.removeEventListener('mousemove', onMouseMove);
      containerRef.current?.removeEventListener('mouseup', onMouseUp);
      containerRef.current?.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [topics, onBubbleClick, selectedBubbleId]);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 touch-none overscroll-none select-none"
    />
  );
};

export default BubbleWorld;
