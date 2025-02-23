
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
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 20; // Moved camera back for better view

    // Renderer setup
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

    // Central planet setup
    const planetGeometry = new THREE.SphereGeometry(4, 64, 64); // Made planet smaller
    const planetMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xFFFAF0,
      roughness: 0.8,
      metalness: 0.1,
    });
    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
    worldGroup.add(planet);

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Raycaster setup
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Create bubbles
    const bubbles: THREE.Mesh[] = [];
    topics.forEach((topic, index) => {
      // Smaller bubble sizes
      const size = topic.size === 'lg' ? 0.6 : topic.size === 'md' ? 0.5 : 0.4;
      const bubbleGeometry = new THREE.SphereGeometry(size, 32, 32);
      
      // Solid material without transparency
      const bubbleMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xFFD700,
        metalness: 0.3,
        roughness: 0.4,
        clearcoat: 0.5,
        transparent: false,
      });

      const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);

      // Create text labels
      const createTextLabel = (text: string, yOffset: number) => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        
        const context = canvas.getContext('2d');
        if (!context) return null;

        // Clear background
        context.fillStyle = 'rgba(255, 255, 255, 0)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Draw text
        context.font = 'bold 32px Inter';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = 'rgba(0, 0, 0, 0.9)';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
        });

        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(2, 0.5, 1);
        sprite.position.y = yOffset;
        
        return sprite;
      };

      // Add labels to bubble with different offsets
      const topicLabel = createTextLabel(topic.topic, 1.2);
      const usernameLabel = createTextLabel(topic.username, 0.8);
      const nameLabel = createTextLabel(topic.name, 0.4);

      if (topicLabel) bubble.add(topicLabel);
      if (usernameLabel) bubble.add(usernameLabel);
      if (nameLabel) bubble.add(nameLabel);

      // Calculate orbital parameters
      const minRadius = 6;
      const maxRadius = 12;
      const orbitRadius = minRadius + (Math.random() * (maxRadius - minRadius));
      
      // Generate random spherical coordinates
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.random() * Math.PI;

      // Set initial position
      bubble.position.setFromSpherical(new THREE.Spherical(orbitRadius, theta, phi));

      // Store animation parameters
      bubble.userData = {
        id: topic.id,
        orbitRadius,
        orbitSpeed: 0.1 + Math.random() * 0.2,
        rotationAxis: new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize(),
        phase: Math.random() * Math.PI * 2,
        originalScale: size,
      };

      worldGroup.add(bubble);
      bubbles.push(bubble);
    });

    // Controls state
    const controlsState = {
      isDragging: false,
      previousTouch: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
    };

    // Touch handlers
    const handleStart = (clientX: number, clientY: number) => {
      controlsState.isDragging = true;
      controlsState.previousTouch = { x: clientX, y: clientY };
      controlsState.velocity = { x: 0, y: 0 };
    };

    const handleMove = (clientX: number, clientY: number) => {
      if (!controlsState.isDragging) return;

      const deltaX = clientX - controlsState.previousTouch.x;
      const deltaY = clientY - controlsState.previousTouch.y;

      const rotationSpeed = 0.005;
      worldGroup.rotation.y += deltaX * rotationSpeed;
      worldGroup.rotation.x += deltaY * rotationSpeed;

      worldGroup.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, worldGroup.rotation.x));

      controlsState.previousTouch = { x: clientX, y: clientY };
      controlsState.velocity = {
        x: deltaX * rotationSpeed * 0.1,
        y: deltaY * rotationSpeed * 0.1,
      };
    };

    const handleEnd = () => {
      controlsState.isDragging = false;
    };

    // Event handlers
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      handleStart(e.touches[0].clientX, e.touches[0].clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    const onMouseDown = (e: MouseEvent) => {
      handleStart(e.clientX, e.clientY);
    };

    const onMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    // Click handler
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

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      const time = Date.now() * 0.001;

      // Update bubbles
      bubbles.forEach(bubble => {
        const { orbitRadius, orbitSpeed, rotationAxis, phase, originalScale, id } = bubble.userData;

        // Calculate new position
        const angle = time * orbitSpeed + phase;
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationAxis(rotationAxis, angle);

        const basePosition = new THREE.Vector3(orbitRadius, 0, 0);
        basePosition.applyMatrix4(rotationMatrix);
        bubble.position.copy(basePosition);

        // Make labels face camera
        bubble.children.forEach(label => {
          label.quaternion.copy(camera.quaternion);
        });

        // Scale effect for selected bubble
        const isSelected = id === selectedBubbleId;
        const targetScale = isSelected ? originalScale * 1.2 : originalScale;
        bubble.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      });

      // Apply momentum
      if (!controlsState.isDragging) {
        worldGroup.rotation.x += controlsState.velocity.y;
        worldGroup.rotation.y += controlsState.velocity.x;
        
        controlsState.velocity.x *= 0.95;
        controlsState.velocity.y *= 0.95;
      }

      renderer.render(scene, camera);
    };

    // Event listeners
    containerRef.current.addEventListener('touchstart', onTouchStart, { passive: false });
    containerRef.current.addEventListener('touchmove', onTouchMove, { passive: false });
    containerRef.current.addEventListener('touchend', handleEnd);
    containerRef.current.addEventListener('mousedown', onMouseDown);
    containerRef.current.addEventListener('mousemove', onMouseMove);
    containerRef.current.addEventListener('mouseup', handleEnd);
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
      
      containerRef.current.removeEventListener('touchstart', onTouchStart);
      containerRef.current.removeEventListener('touchmove', onTouchMove);
      containerRef.current.removeEventListener('touchend', handleEnd);
      containerRef.current.removeEventListener('mousedown', onMouseDown);
      containerRef.current.removeEventListener('mousemove', onMouseMove);
      containerRef.current.removeEventListener('mouseup', handleEnd);
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
