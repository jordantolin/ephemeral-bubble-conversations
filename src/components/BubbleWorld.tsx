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
  }>();

  // Movement state
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

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#FEF7E4');

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Mobile-optimized camera setup
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const isMobile = window.innerWidth < 768;
    camera.position.z = isMobile ? 12 : 15; // Closer view on mobile
    camera.position.y = isMobile ? 1 : 2; // Adjusted vertical position for mobile

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      logarithmicDepthBuffer: true
    });
    renderer.setPixelRatio(window.devicePixelRatio); // Better mobile rendering
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);

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

    // Enhanced resize handler for mobile
    const handleResize = () => {
      if (!containerRef.current) return;
      
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      const newIsMobile = window.innerWidth < 768;
      
      camera.aspect = newWidth / newHeight;
      camera.position.z = newIsMobile ? 12 : 15;
      camera.position.y = newIsMobile ? 1 : 2;
      camera.updateProjectionMatrix();
      
      renderer.setSize(newWidth, newHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Mobile-optimized movement constants
    const INERTIA_DECAY = isMobile ? 0.90 : 0.95; // Faster decay on mobile
    const MAX_ROTATION_SPEED = isMobile ? 0.08 : 0.1;
    const MIN_ZOOM = isMobile ? 7 : 8;
    const MAX_ZOOM = isMobile ? 20 : 25;
    const ZOOM_SPEED = isMobile ? 0.0015 : 0.001;
    const MIN_POLAR_ANGLE = Math.PI * (isMobile ? 0.15 : 0.1);
    const MAX_POLAR_ANGLE = Math.PI * (isMobile ? 0.85 : 0.9);

    // Touch and mouse movement handlers
    const onPointerDown = (event: TouchEvent | MouseEvent) => {
      const controls = controlsRef.current;
      controls.isDragging = true;
      controls.isInertiaActive = false;

      if (event instanceof TouchEvent) {
        if (event.touches.length === 1) {
          controls.lastTouch = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY,
          };
        } else if (event.touches.length === 2) {
          // Store initial pinch distance
          controls.pinchDistance = Math.hypot(
            event.touches[0].clientX - event.touches[1].clientX,
            event.touches[0].clientY - event.touches[1].clientY
          );
        }
      } else {
        controls.lastMouse = {
          x: event.clientX,
          y: event.clientY,
        };
      }
    };

    // Enhanced touch sensitivity for mobile
    const onPointerMove = (event: TouchEvent | MouseEvent) => {
      const controls = controlsRef.current;
      if (!controls.isDragging) return;

      if (event instanceof TouchEvent) {
        event.preventDefault();

        if (event.touches.length === 1) {
          const touch = event.touches[0];
          const deltaX = touch.clientX - controls.lastTouch.x;
          const deltaY = touch.clientY - controls.lastTouch.y;

          // Enhanced touch sensitivity
          const sensitivity = isMobile ? 0.002 : 0.001;
          controls.velocity = {
            x: deltaY * sensitivity,
            y: deltaX * sensitivity,
          };

          controls.lastTouch = { x: touch.clientX, y: touch.clientY };
        } else if (event.touches.length === 2) {
          const currentDistance = Math.hypot(
            event.touches[0].clientX - event.touches[1].clientX,
            event.touches[0].clientY - event.touches[1].clientY
          );

          // Enhanced pinch zoom sensitivity
          const pinchSensitivity = isMobile ? 0.015 : 0.01;
          const delta = (controls.pinchDistance - currentDistance) * pinchSensitivity;
          camera.position.z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.position.z + delta));
          controls.pinchDistance = currentDistance;
        }
      } else {
        // Mouse movement
        const deltaX = event.clientX - controls.lastMouse.x;
        const deltaY = event.clientY - controls.lastMouse.y;

        controls.velocity = {
          x: deltaY * 0.001,
          y: deltaX * 0.001,
        };

        controls.lastMouse = { x: event.clientX, y: event.clientY };
      }

      // Apply rotation limits
      controls.rotation.x += controls.velocity.x;
      controls.rotation.y += controls.velocity.y;

      controls.rotation.x = Math.max(
        MIN_POLAR_ANGLE - Math.PI / 2,
        Math.min(MAX_POLAR_ANGLE - Math.PI / 2, controls.rotation.x)
      );

      // Store momentum for inertia
      controls.momentum = { ...controls.velocity };
    };

    const onPointerUp = () => {
      const controls = controlsRef.current;
      controls.isDragging = false;
      controls.isInertiaActive = true;
    };

    // Mouse wheel zoom
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const zoomDelta = event.deltaY * ZOOM_SPEED;
      camera.position.z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.position.z + zoomDelta));
    };

    // Double tap/click to center view
    let lastTap = 0;
    const onDoubleTap = (event: TouchEvent | MouseEvent) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTap;
      
      if (tapLength < 300 && tapLength > 0) {
        const controls = controlsRef.current;
        controls.rotation = { x: 0, y: 0 };
        controls.momentum = { x: 0, y: 0 };
        controls.velocity = { x: 0, y: 0 };
        camera.position.z = 15;
      }
      
      lastTap = currentTime;
    };

    // Add event listeners
    containerRef.current.addEventListener('mousedown', onPointerDown);
    containerRef.current.addEventListener('touchstart', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchend', onPointerUp);
    containerRef.current.addEventListener('wheel', onWheel, { passive: false });
    containerRef.current.addEventListener('click', onDoubleTap);
    containerRef.current.addEventListener('touchend', onDoubleTap);

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
      
      // Adjusted bubble positioning for mobile
      const baseRadius = isMobile ? 6.5 : 7; // Closer to surface on mobile
      const phi = Math.acos(-1 + (2 * index) / topics.length);
      const theta = Math.sqrt(topics.length * Math.PI) * phi;
      
      bubble.position.setFromSpherical(new THREE.Spherical(baseRadius, phi, theta));
      
      // Mobile-optimized movement parameters
      bubble.userData = {
        id: topic.id,
        orbitSpeed: isMobile ? 0.0002 : 0.00015,
        baseRadius: baseRadius,
        floatAmplitude: isMobile ? 0.2 : 0.3,
        floatSpeed: isMobile ? 0.001 : 0.0008,
        orbitOffset: Math.random() * Math.PI * 2,
        originalScale: topic.size === 'lg' ? 1.2 : topic.size === 'md' ? 1 : 0.8,
        phase: Math.random() * Math.PI * 2,
        verticalOffset: Math.random() * Math.PI * 2,
      };
      
      scene.add(bubble);
      bubbles.push(bubble);
    });

    sceneRef.current = { scene, camera, renderer, bubbles, planet };

    // Enhanced animation with inertia and smooth movement
    const animate = () => {
      requestAnimationFrame(animate);
      
      const controls = controlsRef.current;

      if (!controls.isDragging && controls.isInertiaActive) {
        // Apply inertia
        controls.momentum.x *= INERTIA_DECAY;
        controls.momentum.y *= INERTIA_DECAY;

        // Stop tiny movements
        if (Math.abs(controls.momentum.x) < 0.0001 && Math.abs(controls.momentum.y) < 0.0001) {
          controls.isInertiaActive = false;
          controls.momentum = { x: 0, y: 0 };
        }

        // Apply momentum to rotation
        controls.rotation.x += controls.momentum.x;
        controls.rotation.y += controls.momentum.y;

        // Apply rotation limits
        controls.rotation.x = Math.max(
          MIN_POLAR_ANGLE - Math.PI / 2,
          Math.min(MAX_POLAR_ANGLE - Math.PI / 2, controls.rotation.x)
        );
      }

      // Apply rotations to planet and bubbles
      if (sceneRef.current?.planet) {
        sceneRef.current.planet.rotation.x = controls.rotation.x;
        sceneRef.current.planet.rotation.y = controls.rotation.y;
      }

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
        bubble.position.applyAxisAngle(new THREE.Vector3(1, 0, 0), controls.rotation.x);
        bubble.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), controls.rotation.y);
        
        // Ensure bubbles always face camera
        bubble.quaternion.copy(camera.quaternion);
      });

      renderer.render(scene, camera);
    };

    animate();

    // Enhanced cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      containerRef.current?.removeEventListener('mousedown', onPointerDown);
      containerRef.current?.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchend', onPointerUp);
      containerRef.current?.removeEventListener('wheel', onWheel);
      containerRef.current?.removeEventListener('click', onDoubleTap);
      containerRef.current?.removeEventListener('touchend', onDoubleTap);
    };
  }, [topics, onBubbleClick]);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 touch-none overscroll-none"
    />
  );
};

export default BubbleWorld;
