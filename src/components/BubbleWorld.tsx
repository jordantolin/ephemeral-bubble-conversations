
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
    scene.background = new THREE.Color('#FFFFFF');

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 15;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);

    // Create a fixed container for all bubbles
    const bubbleContainer = new THREE.Group();
    scene.add(bubbleContainer);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    // Raycaster for bubble interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Store all created bubbles
    const bubbles: THREE.Group[] = [];

    // Create bubbles
    topics.forEach((topic, index) => {
      // Create bubble group to hold sphere and text
      const bubbleGroup = new THREE.Group();

      // Create bubble sphere
      const size = topic.size === 'lg' ? 1.5 : topic.size === 'md' ? 1.2 : 0.9;
      const geometry = new THREE.SphereGeometry(size, 32, 32);
      const material = new THREE.MeshPhysicalMaterial({
        color: 0xE8F0FF,
        transparent: true,
        opacity: 0.6,
        metalness: 0.1,
        roughness: 0.2,
        transmission: 0.5,
        thickness: 0.5,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
      });

      const sphere = new THREE.Mesh(geometry, material);
      bubbleGroup.add(sphere);

      // Create text sprites
      const createTextSprite = (text: string, yOffset: number, fontSize: number = 24) => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        
        const context = canvas.getContext('2d');
        if (!context) return null;

        // Clear background
        context.fillStyle = 'rgba(255, 255, 255, 0)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Draw text
        context.font = `${fontSize}px Inter`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = '#000000';
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

      // Add text labels
      const topicSprite = createTextSprite(topic.topic, size * 1.5, 28);
      const usernameSprite = createTextSprite(topic.username, size * 0.8, 20);
      const nameSprite = createTextSprite(topic.name, size * 0, 20);

      if (topicSprite) bubbleGroup.add(topicSprite);
      if (usernameSprite) bubbleGroup.add(usernameSprite);
      if (nameSprite) bubbleGroup.add(nameSprite);

      // Position bubble in 3D space using spherical distribution
      const phi = Math.acos(-1 + (2 * index) / topics.length);
      const theta = Math.sqrt(topics.length * Math.PI) * phi;
      
      const x = 8 * Math.sin(theta) * Math.cos(phi);
      const y = 8 * Math.sin(theta) * Math.sin(phi);
      const z = 8 * Math.cos(theta);
      
      bubbleGroup.position.set(x, y, z);

      // Store bubble data
      bubbleGroup.userData = { id: topic.id };
      bubbles.push(bubbleGroup);
      bubbleContainer.add(bubbleGroup);
    });

    // Interaction state
    let isRotating = false;
    let previousMousePosition = {
      x: 0,
      y: 0
    };
    let targetRotation = {
      x: 0,
      y: 0
    };
    let currentRotation = {
      x: 0,
      y: 0
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

    // Click detection
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

      bubbleContainer.rotation.x = currentRotation.x;
      bubbleContainer.rotation.y = currentRotation.y;

      // Make text always face camera
      bubbles.forEach(bubbleGroup => {
        bubbleGroup.children.forEach(child => {
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
