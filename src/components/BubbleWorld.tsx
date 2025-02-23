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
    bubbleGroup: THREE.Group;
  }>();

  const controlsRef = useRef({
    isDragging: false,
    isInertiaActive: false,
    lastTouch: { x: 0, y: 0 },
    lastMouse: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    pinchDistance: 0,
    rotation: { x: 0, y: 0 },
    momentum: { x: 0, y: 0 },
  });

  const pinchRef = useRef({
    active: false,
    initialDistance: 0,
    initialZoom: 0,
    lastScale: 1,
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#FEF7E4');

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const ZOOM_LIMITS = {
      min: window.innerWidth < 768 ? 8 : 8,
      max: window.innerWidth < 768 ? 16 : 25,
      default: window.innerWidth < 768 ? 10 : 15,
    };

    const camera = new THREE.PerspectiveCamera(
      window.innerWidth < 768 ? 65 : 75,
      width / height,
      0.1,
      1000
    );
    camera.position.z = ZOOM_LIMITS.default;
    camera.position.y = 0;

    const CENTER_LIMITS = {
      x: window.innerWidth < 768 ? 2 : 4,
      y: window.innerWidth < 768 ? 2 : 4
    };

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      logarithmicDepthBuffer: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);

    // Enhanced group setup for better organization and movement
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // Create a separate group for floating elements
    const floatingGroup = new THREE.Group();
    worldGroup.add(floatingGroup);

    // Create the planet with enhanced material
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
    floatingGroup.add(planet);

    // Create bubbles with enhanced positioning
    const bubbles: THREE.Mesh[] = [];
    topics.forEach((topic, index) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = 512;
      canvas.height = 512;
      
      const gradient = context.createRadialGradient(
        canvas.width/2, canvas.height/2, 0,
        canvas.width/2, canvas.height/2, canvas.width/2
      );
      gradient.addColorStop(0, 'rgba(255, 214, 0, 1)');
      gradient.addColorStop(0.7, 'rgba(255, 198, 0, 0.98)');
      gradient.addColorStop(1, 'rgba(255, 198, 0, 0.95)');
      
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(canvas.width/2, canvas.height/2, canvas.width/2, 0, Math.PI * 2);
      context.fill();

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

      const bubbleGeometry = new THREE.CircleGeometry(
        topic.size === 'lg' ? 1.2 : topic.size === 'md' ? 1 : 0.8,
        32
      );
      
      const bubbleMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        depthTest: true,
      });

      const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
      
      // Enhanced bubble positioning for better distribution
      const totalBubbles = topics.length;
      const baseRadius = window.innerWidth < 768 ? 7 : 7.5;
      
      // Fibonacci sphere distribution for more even spacing
      const goldenRatio = (1 + Math.sqrt(5)) / 2;
      const angleIncrement = 2 * Math.PI * goldenRatio;
      
      const t = index / totalBubbles;
      const inclination = Math.acos(1 - 2 * t);
      const azimuth = angleIncrement * index;

      // Convert spherical coordinates to Cartesian
      const x = baseRadius * Math.sin(inclination) * Math.cos(azimuth);
      const y = baseRadius * Math.sin(inclination) * Math.sin(azimuth);
      const z = baseRadius * Math.cos(inclination);

      bubble.position.set(x, y, z);
      
      bubble.userData = {
        id: topic.id,
        originalPosition: bubble.position.clone(),
        originalScale: topic.size === 'lg' ? 1.2 : topic.size === 'md' ? 1 : 0.8,
        floatSpeed: 0.0015 + Math.random() * 0.001,
        floatRange: 0.15,
        phase: Math.random() * Math.PI * 2,
      };

      floatingGroup.add(bubble);
      bubbles.push(bubble);
    });

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0xFFFAF0, 0xFFF5E6, 0.8);
    scene.add(hemisphereLight);

    const updateBubblesScale = (zoomLevel: number) => {
      if (!sceneRef.current?.bubbles) return;

      const zoomFactor = (zoomLevel - ZOOM_LIMITS.min) / (ZOOM_LIMITS.max - ZOOM_LIMITS.min);
      const scaleFactor = 1 + (1 - zoomFactor) * 0.8;

      sceneRef.current.bubbles.forEach((bubble) => {
        const baseScale = bubble.userData.originalScale;
        const targetScale = baseScale * scaleFactor;
        bubble.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      });
    };

    // Enhanced touch controls for smoother movement
    const onTouchStart = (event: TouchEvent) => {
      event.preventDefault();
      const controls = controlsRef.current;

      if (event.touches.length === 1) {
        controls.isDragging = true;
        controls.lastTouch = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY,
        };
        controls.velocity = { x: 0, y: 0 };
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      event.preventDefault();
      const controls = controlsRef.current;

      if (event.touches.length === 1 && controls.isDragging) {
        const touch = event.touches[0];
        const deltaX = touch.clientX - controls.lastTouch.x;
        const deltaY = touch.clientY - controls.lastTouch.y;

        // Enhanced sensitivity and smoothing
        const sensitivity = window.innerWidth < 768 ? 0.003 : 0.002;
        const smoothingFactor = 0.8;

        // Calculate smooth rotation
        const targetRotationX = deltaY * sensitivity;
        const targetRotationY = deltaX * sensitivity;

        // Apply smoothed rotation to the floating group
        floatingGroup.rotation.x += targetRotationX * smoothingFactor;
        floatingGroup.rotation.y += targetRotationY * smoothingFactor;

        // Apply rotation limits
        floatingGroup.rotation.x = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, floatingGroup.rotation.x));

        // Update velocity for inertia
        controls.velocity = {
          x: targetRotationX * smoothingFactor,
          y: targetRotationY * smoothingFactor,
        };

        controls.lastTouch = { x: touch.clientX, y: touch.clientY };
      }
    };

    const onTouchEnd = () => {
      const controls = controlsRef.current;
      controls.isDragging = false;
      
      // Smooth deceleration
      const decayFactor = 0.95;
      controls.velocity = {
        x: controls.velocity.x * decayFactor,
        y: controls.velocity.y * decayFactor,
      };
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const zoomDelta = event.deltaY * 0.01;
      const newZoom = Math.max(
        ZOOM_LIMITS.min,
        Math.min(ZOOM_LIMITS.max, camera.position.z + zoomDelta)
      );
      
      camera.position.z = newZoom;
      updateBubblesScale(newZoom);
    };

    // Animation loop with enhanced movement
    const animate = () => {
      requestAnimationFrame(animate);

      const time = Date.now() * 0.001; // Convert to seconds for smoother animation

      // Apply floating animation to bubbles
      bubbles.forEach((bubble) => {
        const { floatSpeed, floatRange, phase } = bubble.userData;
        
        // Calculate floating motion
        const floatOffset = Math.sin(time * floatSpeed + phase) * floatRange;
        const originalY = bubble.userData.originalPosition.y;
        
        // Apply smooth floating movement
        bubble.position.y = originalY + floatOffset;
        
        // Keep bubbles facing the camera while maintaining position in world
        bubble.quaternion.copy(camera.quaternion);
      });

      // Apply inertia to world rotation
      if (!controlsRef.current.isDragging && 
          (Math.abs(controlsRef.current.velocity.x) > 0.0001 || 
           Math.abs(controlsRef.current.velocity.y) > 0.0001)) {
        
        floatingGroup.rotation.x += controlsRef.current.velocity.x;
        floatingGroup.rotation.y += controlsRef.current.velocity.y;
        
        // Apply smooth deceleration
        controlsRef.current.velocity.x *= 0.95;
        controlsRef.current.velocity.y *= 0.95;
      }

      renderer.render(scene, camera);
    };

    // Add event listeners
    containerRef.current.addEventListener('touchstart', onTouchStart, { passive: false });
    containerRef.current.addEventListener('touchmove', onTouchMove, { passive: false });
    containerRef.current.addEventListener('touchend', onTouchEnd);
    containerRef.current.addEventListener('wheel', onWheel, { passive: false });

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

    // Start animation
    animate();

    sceneRef.current = { 
      scene, 
      camera, 
      renderer, 
      bubbles, 
      planet, 
      bubbleGroup: floatingGroup
    };

    // Cleanup
    return () => {
      containerRef.current?.removeEventListener('touchstart', onTouchStart);
      containerRef.current?.removeEventListener('touchmove', onTouchMove);
      containerRef.current?.removeEventListener('touchend', onTouchEnd);
      containerRef.current?.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      scene.clear();
      renderer.dispose();
    };
  }, [topics, onBubbleClick]);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 touch-none overscroll-none select-none"
    />
  );
};

export default BubbleWorld;
