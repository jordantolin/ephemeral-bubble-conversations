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

    // Setup scene with pure white background
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = window.innerWidth < 768 ? 30 : 25;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    // Create pure white planet with enhanced material
    const planetGeometry = new THREE.SphereGeometry(8, 96, 96); // Increased segments for smoother appearance
    const planetMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.1, // Smoother surface
      metalness: 0.1, // Less metallic for purer white
    });
    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
    scene.add(planet);

    // Enhanced lighting for better white appearance
    const ambientLight = new THREE.AmbientLight(0xffffff, 1); // Increased intensity
    scene.add(ambientLight);

    // Multiple directional lights for better illumination
    const lights = [
      { position: [1, 1, 1], intensity: 0.8 },
      { position: [-1, -1, -1], intensity: 0.4 },
      { position: [1, -1, 1], intensity: 0.6 },
    ];

    lights.forEach(({ position, intensity }) => {
      const light = new THREE.DirectionalLight(0xffffff, intensity);
      light.position.set(...position);
      scene.add(light);
    });

    // Create vibrant yellow bubbles
    const bubbles: THREE.Mesh[] = [];
    const bubbleGeometries = {
      sm: new THREE.SphereGeometry(0.6, 32, 32),
      md: new THREE.SphereGeometry(0.8, 32, 32),
      lg: new THREE.SphereGeometry(1.0, 32, 32),
    };

    topics.forEach((topic, index) => {
      // Enhanced material for more luminous yellow
      const material = new THREE.MeshStandardMaterial({
        color: 0xfff000, // More luminous yellow
        emissive: 0xebcc34, // Adding glow effect
        emissiveIntensity: 0.2,
        roughness: 0.3,
        metalness: 0.2,
      });

      const bubble = new THREE.Mesh(bubbleGeometries[topic.size], material);
      
      const phi = Math.acos(-1 + (2 * index) / topics.length);
      const theta = Math.sqrt(topics.length * Math.PI) * phi;
      const radius = window.innerWidth < 768 ? 16 : 14;
      
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

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    sceneRef.current = { scene, camera, renderer, bubbles, planet, raycaster, mouse };

    // Improved smooth camera movement
    let targetCameraZ = camera.position.z;
    let currentRotationSpeed = 0;
    const DAMPING_FACTOR = 0.92;
    const MAX_ROTATION_SPEED = 0.1;

    const animate = () => {
      requestAnimationFrame(animate);

      // Smooth camera zoom
      camera.position.z += (targetCameraZ - camera.position.z) * 0.1;

      // Smooth rotation with momentum
      if (!isDraggingRef.current) {
        currentRotationSpeed *= DAMPING_FACTOR;
        planet.rotation.y += currentRotationSpeed;
      }

      bubbles.forEach((bubble, index) => {
        const originalPos = bubble.userData.originalPosition;
        const orbitAxis = bubble.userData.orbitAxis;
        
        bubble.position.copy(originalPos);
        bubble.position.applyAxisAngle(orbitAxis, Date.now() * 0.0001 + index * 0.1);
        
        bubble.position.x += Math.sin(Date.now() * 0.001 + index) * 0.05;
        bubble.position.y += Math.cos(Date.now() * 0.001 + index) * 0.05;
      });

      renderer.render(scene, camera);
    };

    // Enhanced controls with momentum
    const onPointerDown = (x: number, y: number) => {
      isDraggingRef.current = true;
      previousTouchRef.current = { x, y };
      currentRotationSpeed = 0;
    };

    const onPointerMove = (x: number, y: number) => {
      if (!isDraggingRef.current) return;
      
      const deltaX = (x - previousTouchRef.current.x) * 0.005;
      const deltaY = (y - previousTouchRef.current.y) * 0.005;
      
      currentRotationSpeed = Math.min(MAX_ROTATION_SPEED, Math.abs(deltaX)) * Math.sign(deltaX);
      
      planet.rotation.y += deltaX;
      planet.rotation.x += deltaY;
      
      bubbles.forEach(bubble => {
        bubble.userData.originalPosition.applyAxisAngle(new THREE.Vector3(0, 1, 0), deltaX);
        bubble.userData.originalPosition.applyAxisAngle(new THREE.Vector3(1, 0, 0), deltaY);
      });
      
      previousTouchRef.current = { x, y };
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
    };

    // Improved zoom with smooth transitions
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const zoomSpeed = 0.5;
      targetCameraZ = Math.max(15, Math.min(40, targetCameraZ + event.deltaY * 0.01 * zoomSpeed));
    };

    // Enhanced touch zoom
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
        targetCameraZ = Math.max(15, Math.min(40, targetCameraZ + delta));
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

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
    };

    window.addEventListener('resize', onResize);
    animate();

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
