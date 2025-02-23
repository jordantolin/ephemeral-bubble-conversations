
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface BubbleWorldProps {
  topics: Array<{
    id: string;
    topic: string;
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
  const isDraggingRef = useRef(false);
  const previousTouchRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    // Setup with mobile-optimized settings
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    // Start further out for better exploration
    camera.position.z = window.innerWidth < 768 ? 30 : 25;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    // Create solid white planet
    const planetGeometry = new THREE.SphereGeometry(8, 64, 64);
    const planetMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.3,
      metalness: 0.2,
    });
    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
    scene.add(planet);

    // Enhanced lighting for better mobile visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Add hemisphere light for better overall illumination
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
    scene.add(hemisphereLight);

    // Create smaller, more circular bubbles
    const bubbles: THREE.Mesh[] = [];
    const bubbleGeometries = {
      sm: new THREE.SphereGeometry(0.6, 32, 32),
      md: new THREE.SphereGeometry(0.8, 32, 32),
      lg: new THREE.SphereGeometry(1.0, 32, 32),
    };

    topics.forEach((topic, index) => {
      const material = new THREE.MeshStandardMaterial({
        color: 0xebcc34, // Exact yellow color requested
        roughness: 0.2,
        metalness: 0.1,
      });

      const bubble = new THREE.Mesh(bubbleGeometries[topic.size], material);
      
      // Wider distribution for better exploration
      const phi = Math.acos(-1 + (2 * index) / topics.length);
      const theta = Math.sqrt(topics.length * Math.PI) * phi;
      const radius = window.innerWidth < 768 ? 16 : 14; // Larger radius for exploration
      
      bubble.position.setFromSpherical(new THREE.Spherical(radius, phi, theta));
      bubble.userData = { 
        id: topic.id, 
        originalPosition: bubble.position.clone(),
        orbitAxis: new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize()
      };
      
      scene.add(bubble);
      bubbles.push(bubble);
    });

    // Raycaster with improved touch precision
    const raycaster = new THREE.Raycaster();
    raycaster.params.Line!.threshold = 0.3;
    const mouse = new THREE.Vector2();

    // Store references
    sceneRef.current = { scene, camera, renderer, bubbles, planet, raycaster, mouse };

    // Optimized animation
    let time = 0;
    let lastTime = 0;
    const animate = (currentTime: number) => {
      requestAnimationFrame(animate);
      
      const delta = (currentTime - lastTime) * 0.001;
      lastTime = currentTime;
      time += delta;

      if (!isDraggingRef.current) {
        planet.rotation.y += delta * 0.2;
      }

      bubbles.forEach((bubble, index) => {
        const originalPos = bubble.userData.originalPosition;
        const orbitAxis = bubble.userData.orbitAxis;
        
        bubble.position.copy(originalPos);
        bubble.position.applyAxisAngle(orbitAxis, time * (0.1 + index * 0.05));
        
        bubble.position.x += Math.sin(time * 1.5 + index) * 0.1;
        bubble.position.y += Math.cos(time * 1.2 + index) * 0.1;
      });

      renderer.render(scene, camera);
    };

    // Enhanced touch and mouse controls with zoom
    const onPointerDown = (x: number, y: number) => {
      isDraggingRef.current = true;
      previousTouchRef.current = { x, y };
    };

    const onPointerMove = (x: number, y: number) => {
      if (!isDraggingRef.current) return;
      
      const deltaX = (x - previousTouchRef.current.x) * (window.innerWidth < 768 ? 1.5 : 1);
      const deltaY = (y - previousTouchRef.current.y) * (window.innerWidth < 768 ? 1.5 : 1);
      
      planet.rotation.y += deltaX * 0.005;
      planet.rotation.x += deltaY * 0.005;
      
      bubbles.forEach(bubble => {
        bubble.userData.originalPosition.applyAxisAngle(new THREE.Vector3(0, 1, 0), deltaX * 0.005);
        bubble.userData.originalPosition.applyAxisAngle(new THREE.Vector3(1, 0, 0), deltaY * 0.005);
      });
      
      previousTouchRef.current = { x, y };
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
    };

    // Zoom functionality
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const zoomSpeed = 0.1;
      camera.position.z = Math.max(15, Math.min(40, camera.position.z + event.deltaY * zoomSpeed));
    };

    // Pinch zoom for mobile
    let initialPinchDistance: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        initialPinchDistance = Math.hypot(
          touch1.clientX - touch2.clientX,
          touch1.clientY - touch2.clientY
        );
      } else if (e.touches.length === 1) {
        const touch = e.touches[0];
        onPointerDown(touch.clientX, touch.clientY);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2 && initialPinchDistance !== null) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.hypot(
          touch1.clientX - touch2.clientX,
          touch1.clientY - touch2.clientY
        );
        const delta = (initialPinchDistance - currentDistance) * 0.05;
        camera.position.z = Math.max(15, Math.min(40, camera.position.z + delta));
        initialPinchDistance = currentDistance;
      } else if (e.touches.length === 1) {
        const touch = e.touches[0];
        onPointerMove(touch.clientX, touch.clientY);
      }
    };

    // Event listeners
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
    window.addEventListener('mousedown', (e) => onPointerDown(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => onPointerMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', onPointerUp);

    // Click handling
    const onClick = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(bubbles);

      if (intersects.length > 0) {
        const bubbleId = intersects[0].object.userData.id;
        onBubbleClick(bubbleId);
      }
    };

    window.addEventListener('click', onClick);

    // Responsive handling
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
    };

    window.addEventListener('resize', onResize);
    animate(0);

    // Cleanup
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onPointerUp);
      window.removeEventListener('mousedown', (e) => onPointerDown(e.clientX, e.clientY));
      window.removeEventListener('mousemove', (e) => onPointerMove(e.clientX, e.clientY));
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [topics, onBubbleClick]);

  return <div ref={containerRef} className="fixed inset-0 -z-10" />;
};

export default BubbleWorld;
