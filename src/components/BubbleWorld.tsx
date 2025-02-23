
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useToast } from "@/hooks/use-toast";
import * as TWEEN from '@tweenjs/tween.js';

interface BubbleWorldProps {
  topics: Array<{
    id: string;
    topic: string;
    username: string;
    name: string;
    size: "sm" | "md" | "lg";
    description?: string;
  }>;
  onBubbleClick: (id: string) => void;
}

const BubbleWorld = ({ topics, onBubbleClick }: BubbleWorldProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedBubble, setSelectedBubble] = useState<string | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup with enhanced atmospheric fog
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xFFFFFF, 15, 30);
    scene.background = new THREE.Color(0xFFFDF7);

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Camera setup with optimal viewing angle
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 15;
    const minDistance = 8;
    const maxDistance = 20;

    // High-quality renderer with improved settings
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      precision: 'highp'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    // Create central planet with enhanced PBR materials
    const planetGeometry = new THREE.SphereGeometry(4, 64, 64);
    const planetMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xFFFFFF,
      metalness: 0.2,
      roughness: 0.3,
      transmission: 0.6,
      thickness: 0.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.0,
    });
    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
    planet.castShadow = true;
    planet.receiveShadow = true;
    scene.add(planet);

    // Enhanced lighting setup
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.4);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xFFFAF0, 1);
    mainLight.position.set(10, 10, 10);
    mainLight.castShadow = true;
    scene.add(mainLight);

    const fillLight = new THREE.PointLight(0xFFF5E0, 0.8, 20);
    fillLight.position.set(-5, -2, 8);
    scene.add(fillLight);

    const rimLight = new THREE.SpotLight(0xFFE4B5, 1);
    rimLight.position.set(0, 10, -10);
    scene.add(rimLight);

    // Bubble container
    const bubbleContainer = new THREE.Group();
    scene.add(bubbleContainer);

    // Raycaster for precise interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Create bubbles with advanced materials
    const bubbles: THREE.Group[] = [];
    const createBubble = (topic: string, username: string, name: string, index: number, size: "sm" | "md" | "lg") => {
      const bubbleGroup = new THREE.Group();
      
      // Size mapping
      const sizeMap = { sm: 0.6, md: 0.8, lg: 1 };
      const bubbleSize = sizeMap[size];

      // Enhanced bubble material with PBR
      const geometry = new THREE.SphereGeometry(bubbleSize, 32, 32);
      const material = new THREE.MeshPhysicalMaterial({
        color: 0xFFE566,
        metalness: 0.1,
        roughness: 0.2,
        transmission: 0.6,
        thickness: 0.5,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        emissive: 0xFFE566,
        emissiveIntensity: 0.2,
      });

      const bubble = new THREE.Mesh(geometry, material);
      bubble.castShadow = true;
      bubble.receiveShadow = true;
      bubbleGroup.add(bubble);

      // Calculate position on planet surface
      const phi = Math.acos(-1 + (2 * index) / topics.length);
      const theta = Math.sqrt(topics.length * Math.PI) * phi;
      
      const radius = 4.5; // Close to planet surface
      const x = radius * Math.sin(theta) * Math.cos(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(theta);
      
      bubbleGroup.position.set(x, y, z);
      bubbleGroup.lookAt(0, 0, 0);

      // Add metadata
      bubbleGroup.userData = {
        id: topic,
        orbitSpeed: 0.001 + Math.random() * 0.001,
        orbitRadius: radius,
        orbitOffset: Math.random() * Math.PI * 2,
      };

      bubbles.push(bubbleGroup);
      bubbleContainer.add(bubbleGroup);
      
      // Animate bubble entry
      bubbleGroup.scale.set(0, 0, 0);
      new TWEEN.Tween(bubbleGroup.scale)
        .to({ x: 1, y: 1, z: 1 }, 1000)
        .easing(TWEEN.Easing.Elastic.Out)
        .delay(index * 150)
        .start();

      return bubbleGroup;
    };

    // Create initial bubbles
    topics.forEach((topic, index) => {
      createBubble(topic.topic, topic.username, topic.name, index, topic.size);
    });

    // Interaction state
    let isRotating = false;
    let isPinching = false;
    let previousMousePosition = { x: 0, y: 0 };
    let previousTouchDistance = 0;

    // Touch controls
    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        isPinching = true;
        previousTouchDistance = getTouchDistance(event.touches);
      } else {
        isRotating = true;
        previousMousePosition = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY
        };
      }
    };

    const getTouchDistance = (touches: TouchList) => {
      return Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      );
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (isPinching && event.touches.length === 2) {
        const distance = getTouchDistance(event.touches);
        const delta = (previousTouchDistance - distance) * 0.03;
        camera.position.z = Math.max(minDistance, Math.min(maxDistance, camera.position.z + delta));
        previousTouchDistance = distance;
      } else if (isRotating && event.touches.length === 1) {
        const deltaX = event.touches[0].clientX - previousMousePosition.x;
        const deltaY = event.touches[0].clientY - previousMousePosition.y;
        
        bubbleContainer.rotation.y += deltaX * 0.005;
        bubbleContainer.rotation.x += deltaY * 0.005;

        previousMousePosition = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY
        };
      }
    };

    const handleTouchEnd = () => {
      isRotating = false;
      isPinching = false;
    };

    // Mouse controls
    const onClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(bubbleContainer.children, true);

      if (intersects.length > 0) {
        let bubble = intersects[0].object;
        while (bubble.parent && !bubble.userData.id) {
          bubble = bubble.parent;
        }
        
        if (bubble.userData.id) {
          setSelectedBubble(bubble.userData.id);
          onBubbleClick(bubble.userData.id);

          // Zoom animation
          new TWEEN.Tween(camera.position)
            .to({ 
              x: bubble.position.x * 0.8,
              y: bubble.position.y * 0.8,
              z: Math.max(bubble.position.z + 5, 8)
            }, 1000)
            .easing(TWEEN.Easing.Cubic.InOut)
            .start();
        }
      }
    };

    // Event listeners
    const element = renderer.domElement;
    element.addEventListener('click', onClick);
    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchmove', handleTouchMove);
    element.addEventListener('touchend', handleTouchEnd);

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

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      // Update TWEEN animations
      TWEEN.update();

      // Rotate bubbles around planet
      bubbles.forEach(bubbleGroup => {
        const userData = bubbleGroup.userData;
        userData.orbitOffset += userData.orbitSpeed;

        // Calculate new position using quaternion rotation
        const quaternion = new THREE.Quaternion();
        quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), userData.orbitOffset);
        
        const position = new THREE.Vector3(userData.orbitRadius, 0, 0);
        position.applyQuaternion(quaternion);
        
        bubbleGroup.position.copy(position);
        bubbleGroup.lookAt(0, 0, 0);
      });

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      
      element.removeEventListener('click', onClick);
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('resize', handleResize);

      // Dispose of resources
      bubbles.forEach(bubble => {
        bubble.children.forEach(child => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            (child.material as THREE.Material).dispose();
          }
        });
      });
      
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
