
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
    // Adjust camera position for better mobile viewing
    camera.position.z = window.innerWidth < 768 ? 25 : 20;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: "high-performance" // Better mobile performance
    });
    renderer.setPixelRatio(window.devicePixelRatio); // Better mobile display
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    // Create solid white planet
    const planetGeometry = new THREE.SphereGeometry(8, 64, 64);
    const planetMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
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

    // Create bubbles with improved visibility
    const bubbles: THREE.Mesh[] = [];
    const bubbleGeometries = {
      sm: new THREE.SphereGeometry(0.8, 32, 32),
      md: new THREE.SphereGeometry(1.2, 32, 32),
      lg: new THREE.SphereGeometry(1.6, 32, 32),
    };

    topics.forEach((topic, index) => {
      const material = new THREE.MeshPhysicalMaterial({
        color: 0xFED766,
        metalness: 0.1,
        roughness: 0.2,
        transparent: true,
        opacity: 0.9,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
      });

      const bubble = new THREE.Mesh(bubbleGeometries[topic.size], material);
      
      // Improved bubble distribution for mobile
      const phi = Math.acos(-1 + (2 * index) / topics.length);
      const theta = Math.sqrt(topics.length * Math.PI) * phi;
      const radius = window.innerWidth < 768 ? 14 : 12; // Larger radius on mobile
      
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

    // Raycaster with improved mobile touch precision
    const raycaster = new THREE.Raycaster();
    raycaster.params.Line!.threshold = 0.3; // Improved touch detection
    const mouse = new THREE.Vector2();

    // Store references
    sceneRef.current = { scene, camera, renderer, bubbles, planet, raycaster, mouse };

    // Optimized animation
    let time = 0;
    let lastTime = 0;
    const animate = (currentTime: number) => {
      requestAnimationFrame(animate);
      
      // Delta time for smooth animations on all devices
      const delta = (currentTime - lastTime) * 0.001;
      lastTime = currentTime;
      time += delta;

      // Smoother rotation
      if (!isDraggingRef.current) {
        planet.rotation.y += delta * 0.2;
      }

      bubbles.forEach((bubble, index) => {
        const originalPos = bubble.userData.originalPosition;
        const orbitAxis = bubble.userData.orbitAxis;
        
        // Smoother orbital motion
        bubble.position.copy(originalPos);
        bubble.position.applyAxisAngle(orbitAxis, time * (0.1 + index * 0.05));
        
        // Gentler floating motion
        bubble.position.x += Math.sin(time * 1.5 + index) * 0.1;
        bubble.position.y += Math.cos(time * 1.2 + index) * 0.1;
        
        bubble.rotation.x += delta * 0.2;
        bubble.rotation.y += delta * 0.2;
      });

      renderer.render(scene, camera);
    };

    // Enhanced touch controls
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

    // Touch events with improved handling
    window.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      onPointerDown(touch.clientX, touch.clientY);
    }, { passive: false });
    
    window.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      onPointerMove(touch.clientX, touch.clientY);
    }, { passive: false });
    
    window.addEventListener('touchend', onPointerUp);

    // Mouse events
    window.addEventListener('mousedown', (e) => onPointerDown(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => onPointerMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', onPointerUp);

    // Interaction events with improved mobile response
    const onInteraction = (event: MouseEvent | Touch) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(bubbles);

      bubbles.forEach(bubble => {
        const material = bubble.material as THREE.MeshPhysicalMaterial;
        material.opacity = 0.9;
      });

      if (intersects.length > 0) {
        const material = (intersects[0].object as THREE.Mesh)
          .material as THREE.MeshPhysicalMaterial;
        material.opacity = 1;
      }
    };

    window.addEventListener('mousemove', onInteraction);
    window.addEventListener('touchmove', (e) => onInteraction(e.touches[0]));

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
      camera.position.z = window.innerWidth < 768 ? 25 : 20;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
    };

    window.addEventListener('resize', onResize);
    animate(0);

    // Cleanup
    return () => {
      window.removeEventListener('mousedown', (e) => onPointerDown(e.clientX, e.clientY));
      window.removeEventListener('mousemove', (e) => onPointerMove(e.clientX, e.clientY));
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchstart', (e) => onPointerDown(e.touches[0].clientX, e.touches[0].clientY));
      window.removeEventListener('touchmove', (e) => onPointerMove(e.touches[0].clientX, e.touches[0].clientY));
      window.removeEventListener('touchend', onPointerUp);
      window.removeEventListener('mousemove', onInteraction);
      window.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [topics, onBubbleClick]);

  return <div ref={containerRef} className="fixed inset-0 -z-10" />;
};

export default BubbleWorld;
