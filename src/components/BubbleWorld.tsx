
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

    // Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 20;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    // Create white planet
    const planetGeometry = new THREE.SphereGeometry(8, 64, 64);
    const planetMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.1,
      transmission: 0.9,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
    scene.add(planet);

    // Lighting for better appearance
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Create bubbles
    const bubbles: THREE.Mesh[] = [];
    const bubbleGeometries = {
      sm: new THREE.SphereGeometry(0.8, 32, 32),
      md: new THREE.SphereGeometry(1.2, 32, 32),
      lg: new THREE.SphereGeometry(1.6, 32, 32),
    };

    topics.forEach((topic, index) => {
      const material = new THREE.MeshPhysicalMaterial({
        color: 0xFED766,
        transparent: true,
        opacity: 0.8,
        metalness: 0.1,
        roughness: 0.2,
        transmission: 0.5,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
      });

      const bubble = new THREE.Mesh(bubbleGeometries[topic.size], material);
      
      // Distribute bubbles around the planet
      const phi = Math.acos(-1 + (2 * index) / topics.length);
      const theta = Math.sqrt(topics.length * Math.PI) * phi;
      const radius = 12; // Distance from planet center
      
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

    // Raycaster for interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Store references
    sceneRef.current = { scene, camera, renderer, bubbles, planet, raycaster, mouse };

    // Animation
    let time = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      time += 0.001;

      // Rotate planet slowly
      if (!isDraggingRef.current) {
        planet.rotation.y += 0.001;
      }

      bubbles.forEach((bubble, index) => {
        const originalPos = bubble.userData.originalPosition;
        const orbitAxis = bubble.userData.orbitAxis;
        
        // Orbit around their original positions
        bubble.position.copy(originalPos);
        bubble.position.applyAxisAngle(orbitAxis, time * (0.2 + index * 0.1));
        
        // Add gentle floating motion
        bubble.position.x += Math.sin(time * 2 + index) * 0.2;
        bubble.position.y += Math.cos(time * 1.5 + index) * 0.2;
        
        // Rotate bubbles gently
        bubble.rotation.x += 0.001;
        bubble.rotation.y += 0.001;
      });

      renderer.render(scene, camera);
    };

    // Mouse/Touch controls
    const onPointerDown = (x: number, y: number) => {
      isDraggingRef.current = true;
      previousTouchRef.current = { x, y };
    };

    const onPointerMove = (x: number, y: number) => {
      if (!isDraggingRef.current) return;
      
      const deltaX = x - previousTouchRef.current.x;
      const deltaY = y - previousTouchRef.current.y;
      
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

    // Mouse events
    window.addEventListener('mousedown', (e) => onPointerDown(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => onPointerMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', onPointerUp);

    // Touch events
    window.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      onPointerDown(touch.clientX, touch.clientY);
    });
    
    window.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      onPointerMove(touch.clientX, touch.clientY);
    });
    
    window.addEventListener('touchend', onPointerUp);

    // Interaction events
    const onInteraction = (event: MouseEvent | Touch) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(bubbles);

      bubbles.forEach(bubble => {
        const material = bubble.material as THREE.MeshPhysicalMaterial;
        material.opacity = 0.8;
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

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', onResize);
    animate();

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
