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

    // Create a group to hold the planet and bubbles
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // Create the planet
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
    worldGroup.add(planet);

    // Create a group for bubbles
    const bubbleGroup = new THREE.Group();
    worldGroup.add(bubbleGroup);

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

    const onTouchStart = (event: TouchEvent) => {
      event.preventDefault();
      const controls = controlsRef.current;

      if (event.touches.length === 2) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        
        pinchRef.current.active = true;
        pinchRef.current.initialDistance = Math.hypot(
          touch1.clientX - touch2.clientX,
          touch1.clientY - touch2.clientY
        );
        pinchRef.current.initialZoom = camera.position.z;
        controls.isDragging = false;
      } else if (event.touches.length === 1) {
        controls.isDragging = true;
        controls.lastTouch = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY,
        };
        controls.momentum = { x: 0, y: 0 };
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      event.preventDefault();
      const controls = controlsRef.current;

      if (event.touches.length === 2 && pinchRef.current.active) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        
        const currentDistance = Math.hypot(
          touch1.clientX - touch2.clientX,
          touch1.clientY - touch2.clientY
        );

        const scale = currentDistance / pinchRef.current.initialDistance;
        const zoomDelta = (pinchRef.current.lastScale - scale) * 15;
        
        const newZoom = Math.max(
          ZOOM_LIMITS.min,
          Math.min(ZOOM_LIMITS.max, pinchRef.current.initialZoom + zoomDelta)
        );

        camera.position.z = newZoom;
        updateBubblesScale(newZoom);
        
        pinchRef.current.lastScale = scale;
      } else if (event.touches.length === 1 && controls.isDragging) {
        const touch = event.touches[0];
        const deltaX = touch.clientX - controls.lastTouch.x;
        const deltaY = touch.clientY - controls.lastTouch.y;

        const sensitivity = window.innerWidth < 768 ? 0.004 : 0.002;
        const rotationX = deltaY * sensitivity;
        const rotationY = deltaX * sensitivity;

        // Apply rotation to the entire world group
        worldGroup.rotation.x += rotationX;
        worldGroup.rotation.y += rotationY;

        // Limit vertical rotation
        worldGroup.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, worldGroup.rotation.x));

        controls.velocity = {
          x: rotationX,
          y: rotationY,
        };

        controls.lastTouch = { x: touch.clientX, y: touch.clientY };
        controls.momentum = {
          x: controls.velocity.x * 0.9,
          y: controls.velocity.y * 0.9,
        };
      }
    };

    const onTouchEnd = (event: TouchEvent) => {
      const controls = controlsRef.current;
      
      if (event.touches.length === 0) {
        controls.isDragging = false;
        pinchRef.current.active = false;
        
        const velocityMagnitude = Math.hypot(controls.velocity.x, controls.velocity.y);
        controls.isInertiaActive = velocityMagnitude > 0.0001;
        
        if (controls.isInertiaActive) {
          controls.momentum = {
            x: controls.velocity.x * 0.95,
            y: controls.velocity.y * 0.95,
          };
        }
      } else if (event.touches.length === 1) {
        pinchRef.current.active = false;
        controls.isDragging = true;
        controls.lastTouch = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY,
        };
      }
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

    // Create bubbles
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
      
      // Position bubbles around the planet
      const baseRadius = window.innerWidth < 768 ? 6.5 : 7;
      const phi = Math.acos(-1 + (2 * index) / topics.length);
      const theta = Math.sqrt(topics.length * Math.PI) * phi;
      
      bubble.position.setFromSpherical(new THREE.Spherical(baseRadius, phi, theta));
      
      bubble.userData = {
        id: topic.id,
        originalScale: topic.size === 'lg' ? 1.2 : topic.size === 'md' ? 1 : 0.8,
        orbitSpeed: 0.0002,
        floatSpeed: 0.001,
        phase: Math.random() * Math.PI * 2,
      };

      bubbleGroup.add(bubble);
      bubbles.push(bubble);
    });

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      const controls = controlsRef.current;

      if (!controls.isDragging && controls.isInertiaActive) {
        controls.momentum.x *= 0.92;
        controls.momentum.y *= 0.92;

        const newRotationX = controls.rotation.x + controls.momentum.x;
        const newRotationY = controls.rotation.y + controls.momentum.y;

        controls.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, newRotationX));
        controls.rotation.y = newRotationY;

        const centeringThreshold = 0.001;
        if (Math.abs(controls.momentum.x) < centeringThreshold) {
          controls.rotation.x *= 0.95;
        }

        if (Math.abs(controls.momentum.x) < 0.0001 && Math.abs(controls.momentum.y) < 0.0001) {
          controls.isInertiaActive = false;
          controls.momentum = { x: 0, y: 0 };
        }
      }

      if (sceneRef.current?.planet) {
        const lerpFactor = window.innerWidth < 768 ? 0.15 : 0.1;
        sceneRef.current.planet.rotation.x += (controls.rotation.x - sceneRef.current.planet.rotation.x) * lerpFactor;
        sceneRef.current.planet.rotation.y += (controls.rotation.y - sceneRef.current.planet.rotation.y) * lerpFactor;
        
        sceneRef.current.planet.position.x = 0;
        sceneRef.current.planet.position.y = 0;
      }

      // Keep bubbles facing the camera while maintaining their positions
      bubbles.forEach((bubble) => {
        bubble.quaternion.copy(camera.quaternion);
        
        const time = Date.now();
        const floatOffset = Math.sin(time * bubble.userData.floatSpeed + bubble.userData.phase) * 0.1;
        bubble.position.y += (floatOffset * 0.005 - bubble.position.y * 0.1);
      });

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
      bubbleGroup 
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
