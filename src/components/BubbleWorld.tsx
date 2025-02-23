
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
    camera.position.z = 20;

    // Renderer setup with antialiasing
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);

    // World group for collective rotation
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // Enhanced bubble material
    const createBubbleMaterial = () => new THREE.MeshPhysicalMaterial({
      color: 0xFFFF00,
      metalness: 0.1,
      roughness: 0.2,
      transmission: 0.95,
      thickness: 0.5,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
    });

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Raycaster for interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Create bubbles with labels
    const bubbles: THREE.Mesh[] = [];
    topics.forEach((topic) => {
      // Create bubble group
      const bubbleGroup = new THREE.Group();
      
      // Create bubble mesh
      const size = topic.size === 'lg' ? 1.2 : topic.size === 'md' ? 1 : 0.8;
      const bubbleGeometry = new THREE.SphereGeometry(size, 32, 32);
      const bubbleMaterial = createBubbleMaterial();
      const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
      
      // Create text labels
      const createTextSprite = (text: string, yOffset: number) => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        
        const context = canvas.getContext('2d');
        if (!context) return null;

        context.fillStyle = 'rgba(255, 255, 255, 0)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.font = 'bold 24px Inter';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = '#000000';
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

      // Add labels to bubble
      const topicLabel = createTextSprite(topic.topic, size * 1.5);
      const usernameLabel = createTextSprite(topic.username, size * 1.2);
      const nameLabel = createTextSprite(topic.name, size * 0.9);

      if (topicLabel) bubbleGroup.add(topicLabel);
      if (usernameLabel) bubbleGroup.add(usernameLabel);
      if (nameLabel) bubbleGroup.add(nameLabel);
      
      bubbleGroup.add(bubble);

      // Position in 3D space
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.acos((Math.random() * 2) - 1);
      const radius = 8 + Math.random() * 4;

      bubbleGroup.position.x = radius * Math.sin(theta) * Math.cos(phi);
      bubbleGroup.position.y = radius * Math.sin(theta) * Math.sin(phi);
      bubbleGroup.position.z = radius * Math.cos(theta);

      // Store metadata
      bubble.userData = {
        id: topic.id,
        group: bubbleGroup,
      };

      worldGroup.add(bubbleGroup);
      bubbles.push(bubble);
    });

    // Interaction state
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let targetRotation = { x: 0, y: 0 };
    let currentRotation = { x: 0, y: 0 };

    // Event handlers
    const onMouseDown = (event: MouseEvent) => {
      isDragging = true;
      previousMousePosition = {
        x: event.clientX,
        y: event.clientY,
      };
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;

      const deltaMove = {
        x: event.clientX - previousMousePosition.x,
        y: event.clientY - previousMousePosition.y,
      };

      targetRotation.x += deltaMove.y * 0.005;
      targetRotation.y += deltaMove.x * 0.005;

      previousMousePosition = {
        x: event.clientX,
        y: event.clientY,
      };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onClick = (event: MouseEvent) => {
      event.preventDefault();
      
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(bubbles);

      if (intersects.length > 0) {
        const bubble = intersects[0].object;
        const id = bubble.userData.id;
        setSelectedBubbleId(id);
        onBubbleClick(id);
      }
    };

    // Add event listeners
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('click', onClick);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      // Smooth rotation
      currentRotation.x += (targetRotation.x - currentRotation.x) * 0.1;
      currentRotation.y += (targetRotation.y - currentRotation.y) * 0.1;
      
      worldGroup.rotation.x = currentRotation.x;
      worldGroup.rotation.y = currentRotation.y;

      // Make labels face camera
      bubbles.forEach(bubble => {
        const group = bubble.userData.group;
        if (group) {
          group.children.forEach(child => {
            if (child instanceof THREE.Sprite) {
              child.quaternion.copy(camera.quaternion);
            }
          });
        }
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
      
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('click', onClick);
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
