
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

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#FEF7E4');

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      window.innerWidth < 768 ? 70 : 60,
      width / height,
      0.1,
      1000
    );
    camera.position.z = window.innerWidth < 768 ? 12 : 15;

    // Enhanced renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);

    // World group setup
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // Central planet setup with enhanced material
    const planetGeometry = new THREE.SphereGeometry(5, 64, 64);
    const planetMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xFFFAF0,
      roughness: 0.5,
      metalness: 0.1,
      clearcoat: 0.3,
      transmission: 0.1,
      ior: 1.2,
    });
    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
    worldGroup.add(planet);

    // Enhanced lighting for better 3D effect
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1.2);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0xFFFAF0, 0xFFF5E6, 0.6);
    scene.add(hemisphereLight);

    // Raycaster setup
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Create 3D bubbles
    const bubbles: THREE.Mesh[] = [];
    topics.forEach((topic, index) => {
      // Create bubble geometry (now using SphereGeometry instead of CircleGeometry)
      const size = topic.size === 'lg' ? 1.2 : topic.size === 'md' ? 1 : 0.8;
      const bubbleGeometry = new THREE.SphereGeometry(size, 32, 32);
      
      // Create custom bubble material with gradient and transparency
      const bubbleMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xFFD700,
        metalness: 0.1,
        roughness: 0.2,
        transmission: 0.95,
        thickness: 0.5,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        ior: 1.5,
        transparent: true,
        opacity: 0.8,
      });

      const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);

      // Create text sprite for bubble content
      const createTextSprite = (text: string, size: number, yOffset: number) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return null;

        canvas.width = 256;
        canvas.height = 256;

        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.font = `bold ${size}px Inter`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 128, 128);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ 
          map: texture,
          transparent: true,
          opacity: 0.9
        });
        
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(2, 1, 1);
        sprite.position.y = yOffset;
        
        return sprite;
      };

      // Add text sprites to bubble
      const topicSprite = createTextSprite(topic.topic, 32, 0.5);
      const usernameSprite = createTextSprite(topic.username, 24, 0);
      const nameSprite = createTextSprite(topic.name, 20, -0.5);

      if (topicSprite) bubble.add(topicSprite);
      if (usernameSprite) bubble.add(usernameSprite);
      if (nameSprite) bubble.add(nameSprite);

      // Calculate orbital parameters
      const orbitRadius = 8;
      const phi = Math.acos(-1 + (2 * index) / topics.length);
      const theta = Math.sqrt(topics.length * Math.PI) * phi;

      // Set initial position on orbital sphere
      bubble.position.setFromSpherical(new THREE.Spherical(
        orbitRadius,
        phi,
        theta
      ));

      // Store orbital parameters for animation
      bubble.userData = {
        id: topic.id,
        orbitRadius,
        orbitSpeed: 0.0002 + Math.random() * 0.0001,
        orbitOffset: Math.random() * Math.PI * 2,
        verticalOffset: Math.random() * Math.PI * 2,
        bobSpeed: 0.001 + Math.random() * 0.0005,
        originalScale: size,
      };

      worldGroup.add(bubble);
      bubbles.push(bubble);
    });

    // Touch and mouse controls setup
    const controls = {
      isDragging: false,
      previousTouch: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
    };

    // Touch event handlers
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      controls.isDragging = true;
      controls.previousTouch = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!controls.isDragging) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - controls.previousTouch.x;
      const deltaY = touch.clientY - controls.previousTouch.y;

      const rotationSpeed = 0.002;
      worldGroup.rotation.y += deltaX * rotationSpeed;
      worldGroup.rotation.x += deltaY * rotationSpeed;

      // Limit vertical rotation
      worldGroup.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, worldGroup.rotation.x));

      controls.previousTouch = { x: touch.clientX, y: touch.clientY };
      controls.velocity = {
        x: deltaX * rotationSpeed * 0.1,
        y: deltaY * rotationSpeed * 0.1,
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      controls.isDragging = false;
    };

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      const time = Date.now() * 0.001;

      // Update bubble positions
      bubbles.forEach((bubble) => {
        const {
          orbitRadius,
          orbitSpeed,
          orbitOffset,
          verticalOffset,
          bobSpeed,
          originalScale,
          id
        } = bubble.userData;

        // Calculate orbital position
        const angle = time * orbitSpeed + orbitOffset;
        const verticalBob = Math.sin(time * bobSpeed + verticalOffset) * 0.5;

        // Update bubble position
        bubble.position.x = orbitRadius * Math.cos(angle);
        bubble.position.y = verticalBob;
        bubble.position.z = orbitRadius * Math.sin(angle);

        // Make text sprites face camera
        bubble.children.forEach(child => {
          child.quaternion.copy(camera.quaternion);
        });

        // Scale effect for selected bubble
        const isSelected = id === selectedBubbleId;
        const targetScale = isSelected ? originalScale * 1.2 : originalScale;
        bubble.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      });

      // Apply inertia to world rotation
      if (!controls.isDragging) {
        worldGroup.rotation.x += controls.velocity.y;
        worldGroup.rotation.y += controls.velocity.x;
        
        controls.velocity.x *= 0.95;
        controls.velocity.y *= 0.95;
      }

      renderer.render(scene, camera);
    };

    // Event listeners
    containerRef.current.addEventListener('touchstart', handleTouchStart, { passive: false });
    containerRef.current.addEventListener('touchmove', handleTouchMove, { passive: false });
    containerRef.current.addEventListener('touchend', handleTouchEnd);

    // Click/tap handler
    const handleClick = (e: MouseEvent | TouchEvent) => {
      const coords = 'touches' in e ? e.touches[0] : e;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((coords.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((coords.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(bubbles);

      if (intersects.length > 0) {
        const bubble = intersects[0].object;
        const id = bubble.userData.id;
        setSelectedBubbleId(id);
        onBubbleClick(id);
      }
    };

    containerRef.current.addEventListener('click', handleClick);

    // Window resize handler
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
      
      containerRef.current.removeEventListener('touchstart', handleTouchStart);
      containerRef.current.removeEventListener('touchmove', handleTouchMove);
      containerRef.current.removeEventListener('touchend', handleTouchEnd);
      containerRef.current.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      
      renderer.dispose();
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
