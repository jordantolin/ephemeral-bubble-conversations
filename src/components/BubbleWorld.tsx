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

    // Setup scene with light yellow background
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#FEF7E4');

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = window.innerWidth < 768 ? 20 : 18; // Adjusted camera distance

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    // Create minimal planet with subtle details
    const planetGeometry = new THREE.SphereGeometry(8, 128, 128);
    const planetMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xFFFFFF,
      roughness: 0.4,
      metalness: 0.1,
      clearcoat: 0.3,
      clearcoatRoughness: 0.3,
      transmission: 0.05,
      ior: 1.2,
    });
    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
    scene.add(planet);

    // Minimal lighting setup
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1.2);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0xFFFAF0, 0xFFF5E6, 0.8);
    scene.add(hemisphereLight);

    const mainLight = new THREE.DirectionalLight(0xFFFFFF, 1.2);
    mainLight.position.set(1, 1, 1);
    scene.add(mainLight);

    // Subtle text creation for inside bubbles
    const createTextSprite = (text: string) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return null;

      canvas.width = 256;
      canvas.height = 128;

      context.fillStyle = 'rgba(255, 255, 255, 0.9)';
      context.font = '32px Inter';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, canvas.width / 2, canvas.height / 2);

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      
      const spriteMaterial = new THREE.SpriteMaterial({ 
        map: texture,
        transparent: true,
        opacity: 0.8,
      });
      
      return new THREE.Sprite(spriteMaterial);
    };

    // Minimal bubble design
    const bubbles: THREE.Mesh[] = [];
    const bubbleGeometries = {
      sm: new THREE.SphereGeometry(0.6, 32, 32),
      md: new THREE.SphereGeometry(0.8, 32, 32),
      lg: new THREE.SphereGeometry(1.0, 32, 32),
    };

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

        // Update label position to follow its bubble
        const label = bubble.userData.label;
        if (label) {
          label.position.copy(bubble.position);
          label.position.y += 0.8;
          label.lookAt(camera.position);
        }
      });

      renderer.render(scene, camera);
    };

    topics.forEach((topic, index) => {
      const bubbleMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xFFF5E6,
        emissive: 0xFFF0DB,
        emissiveIntensity: 0.2,
        roughness: 0.3,
        metalness: 0.1,
        clearcoat: 0.3,
        transmission: 0.2,
        opacity: 0.9,
        transparent: true,
      });

      const bubble = new THREE.Mesh(bubbleGeometries[topic.size], bubbleMaterial);
      
      const phi = Math.acos(-1 + (2 * index) / topics.length);
      const theta = Math.sqrt(topics.length * Math.PI) * phi;
      const radius = window.innerWidth < 768 ? 10 : 9;
      
      bubble.position.setFromSpherical(new THREE.Spherical(radius, phi, theta));
      
      // Create and position text inside bubble
      const label = createTextSprite(topic.topic);
      if (label) {
        label.scale.set(0.5, 0.25, 1);
        label.position.copy(bubble.position);
        label.position.y += 0.2;
        scene.add(label);
        bubble.userData = { 
          id: topic.id, 
          originalPosition: bubble.position.clone(),
          orbitAxis: new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
          ).normalize(),
          label: label
        };
      }
      
      scene.add(bubble);
      bubbles.push(bubble);
    });

    // Enhanced smooth camera movement
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

    // Improved smooth zoom
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
      
      // Clean up all objects
      bubbles.forEach(bubble => {
        if (bubble.userData.label) {
          scene.remove(bubble.userData.label);
        }
        scene.remove(bubble);
      });
      scene.remove(planet);
      containerRef.current?.removeChild(renderer.domElement);
    };

  }, [topics, onBubbleClick]);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0"
    />
  );
};

export default BubbleWorld;
