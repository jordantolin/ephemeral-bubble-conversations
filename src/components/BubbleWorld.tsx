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
  
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup with fog for depth
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xFFFFFF, 20, 50);
    scene.background = new THREE.Color('#FFFFFF');

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Enhanced camera setup with constraints
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 20;
    const minDistance = 10;
    const maxDistance = 30;

    // High-quality renderer
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

    // Create central planet
    const planetGeometry = new THREE.SphereGeometry(5, 64, 64);
    const planetMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xFFFFFF,
      metalness: 0.1,
      roughness: 0.8,
      transmission: 0.5,
      thickness: 0.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
    scene.add(planet);

    // Bubble container
    const bubbleContainer = new THREE.Group();
    scene.add(bubbleContainer);

    // Enhanced lighting setup
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xFFF5E0, 1, 50);
    pointLight.position.set(-10, 5, 10);
    scene.add(pointLight);

    // Raycaster for interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Store bubbles
    const bubbles: THREE.Group[] = [];

    // Create bubbles with enhanced materials
    topics.forEach((topic, index) => {
      const bubbleGroup = new THREE.Group();

      // Enhanced bubble material
      const size = topic.size === 'lg' ? 1.5 : topic.size === 'md' ? 1.2 : 0.9;
      const geometry = new THREE.SphereGeometry(size, 32, 32);
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

      const sphere = new THREE.Mesh(geometry, material);
      sphere.castShadow = true;
      sphere.receiveShadow = true;
      bubbleGroup.add(sphere);

      // Enhanced text sprites
      const createTextSprite = (text: string, yOffset: number, fontSize: number = 24) => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        
        const context = canvas.getContext('2d');
        if (!context) return null;

        context.fillStyle = 'rgba(255, 255, 255, 0)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.font = `${fontSize}px Inter`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = '#000000';
        
        // Add text shadow for better visibility
        context.shadowColor = 'rgba(255, 255, 255, 0.8)';
        context.shadowBlur = 4;
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        const spriteMaterial = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
        });

        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.set(0, yOffset, 0);
        sprite.scale.set(3, 0.75, 1);
        
        return sprite;
      };

      // Add text labels with improved positioning
      const topicSprite = createTextSprite(topic.topic, size * 1.5, 28);
      const usernameSprite = createTextSprite(topic.username, size * 0.8, 20);
      const nameSprite = createTextSprite(topic.name, size * 0, 20);

      if (topicSprite) bubbleGroup.add(topicSprite);
      if (usernameSprite) bubbleGroup.add(usernameSprite);
      if (nameSprite) bubbleGroup.add(nameSprite);

      // Position bubbles in orbital paths
      const orbitRadius = 12 + Math.random() * 3;
      const angleStep = (2 * Math.PI) / topics.length;
      const angle = index * angleStep;
      
      const x = orbitRadius * Math.cos(angle);
      const y = (Math.random() - 0.5) * 8;
      const z = orbitRadius * Math.sin(angle);
      
      bubbleGroup.position.set(x, y, z);

      // Add orbital animation data
      bubbleGroup.userData = {
        id: topic.id,
        orbitRadius,
        orbitSpeed: 0.0005 + Math.random() * 0.0005,
        orbitOffset: angle,
        verticalSpeed: 0.001 + Math.random() * 0.001,
        verticalOffset: Math.random() * Math.PI * 2,
      };

      bubbles.push(bubbleGroup);
      bubbleContainer.add(bubbleGroup);
    });

    // Interaction state
    let isRotating = false;
    let isPinching = false;
    let previousMousePosition = { x: 0, y: 0 };
    let previousTouchDistance = 0;
    let targetRotation = { x: 0, y: 0 };
    let currentRotation = { x: 0, y: 0 };

    // Touch controls
    const getTouchDistance = (touches: TouchList) => {
      return Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      );
    };

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

    const handleTouchMove = (event: TouchEvent) => {
      if (isPinching && event.touches.length === 2) {
        const distance = getTouchDistance(event.touches);
        const delta = (previousTouchDistance - distance) * 0.05;
        camera.position.z = Math.max(minDistance, Math.min(maxDistance, camera.position.z + delta));
        previousTouchDistance = distance;
      } else if (isRotating && event.touches.length === 1) {
        const deltaX = event.touches[0].clientX - previousMousePosition.x;
        const deltaY = event.touches[0].clientY - previousMousePosition.y;

        targetRotation.x += deltaY * 0.005;
        targetRotation.y += deltaX * 0.005;

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
    const onMouseDown = (event: MouseEvent) => {
      isRotating = true;
      previousMousePosition = {
        x: event.clientX,
        y: event.clientY
      };
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!isRotating) return;

      const deltaX = event.clientX - previousMousePosition.x;
      const deltaY = event.clientY - previousMousePosition.y;

      targetRotation.x += deltaY * 0.005;
      targetRotation.y += deltaX * 0.005;

      previousMousePosition = {
        x: event.clientX,
        y: event.clientY
      };
    };

    const onMouseUp = () => {
      isRotating = false;
    };

    // Wheel zoom
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY * 0.01;
      camera.position.z = Math.max(minDistance, Math.min(maxDistance, camera.position.z + delta));
    };

    // Click/tap detection
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
          setSelectedBubbleId(bubble.userData.id);
          onBubbleClick(bubble.userData.id);
        }
      }
    };

    // Add event listeners
    const element = renderer.domElement;
    element.addEventListener('mousedown', onMouseDown);
    element.addEventListener('mousemove', onMouseMove);
    element.addEventListener('mouseup', onMouseUp);
    element.addEventListener('click', onClick);
    element.addEventListener('wheel', onWheel, { passive: false });
    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchmove', handleTouchMove);
    element.addEventListener('touchend', handleTouchEnd);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      // Smooth rotation
      currentRotation.x += (targetRotation.x - currentRotation.x) * 0.1;
      currentRotation.y += (targetRotation.y - currentRotation.y) * 0.1;

      bubbleContainer.rotation.x = currentRotation.x;
      bubbleContainer.rotation.y = currentRotation.y;

      // Animate bubbles in their orbits
      bubbles.forEach(bubble => {
        const userData = bubble.userData;
        userData.orbitOffset += userData.orbitSpeed;
        
        // Update bubble position
        bubble.position.x = userData.orbitRadius * Math.cos(userData.orbitOffset);
        bubble.position.z = userData.orbitRadius * Math.sin(userData.orbitOffset);
        bubble.position.y += Math.sin(userData.verticalOffset) * userData.verticalSpeed;
        userData.verticalOffset += userData.verticalSpeed;

        // Keep vertical position within bounds
        if (bubble.position.y > 4) bubble.position.y = 4;
        if (bubble.position.y < -4) bubble.position.y = -4;

        // Make text face camera
        bubble.children.forEach(child => {
          if (child instanceof THREE.Sprite) {
            child.quaternion.copy(camera.quaternion);
          }
        });
      });

      renderer.render(scene, camera);
    };

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

    // Cleanup
    return () => {
      if (!containerRef.current) return;
      
      element.removeEventListener('mousedown', onMouseDown);
      element.removeEventListener('mousemove', onMouseMove);
      element.removeEventListener('mouseup', onMouseUp);
      element.removeEventListener('click', onClick);
      element.removeEventListener('wheel', onWheel);
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('resize', handleResize);
      
      renderer.dispose();
      containerRef.current.removeChild(renderer.domElement);
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
