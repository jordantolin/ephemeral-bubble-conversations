
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { BubbleWorldProps } from '@/types/bubble';
import { 
  createBubbleGeometry, 
  createBubbleMaterial, 
  createTextCanvas
} from '@/utils/bubbleUtils';
import { useBubbleInteraction } from '@/hooks/useBubbleInteraction';
import { useCameraControls } from '@/hooks/useCameraControls';

const BubbleWorld = ({ topics, onBubbleClick }: BubbleWorldProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bubblesRef = useRef<{ [key: string]: THREE.Group }>({});
  const sceneRef = useRef<THREE.Scene | null>(null);
  const animationFrameRef = useRef<number>();
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const { isInteractingRef, targetRotationRef, dragStartRef, isDraggingRef } = useBubbleInteraction();
  const { handleMouseDown, handleMouseMove, handleMouseUp, handleWheel, updateCamera, handlePinchZoom, mouseRef } = useCameraControls();

  useEffect(() => {
    if (!containerRef.current || !topics.length) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup - positioned to view the scene from front
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 10;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 2);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 5, 10);
    scene.add(directionalLight);

    // Create bubbles
    topics.forEach((topic, index) => {
      const group = new THREE.Group();
      
      // Create bubble
      const size = topic.size === 'lg' ? 0.8 : 
                   topic.size === 'md' ? 0.6 : 0.4;
      const scaledSize = size * (1 + topic.reflect_count * 0.05);
      
      const geometry = createBubbleGeometry(scaledSize);
      const material = createBubbleMaterial();
      const bubble = new THREE.Mesh(geometry, material);
      group.add(bubble);

      // Add text labels
      const nameTexture = new THREE.CanvasTexture(createTextCanvas(topic.name, 32));
      const nameSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: nameTexture }));
      nameSprite.scale.set(2 * scaledSize, 1 * scaledSize, 1);
      nameSprite.position.y = 1.2 * scaledSize;
      group.add(nameSprite);

      const countTexture = new THREE.CanvasTexture(createTextCanvas(`✨ ${topic.reflect_count}`, 24));
      const countSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: countTexture }));
      countSprite.scale.set(2 * scaledSize, 1 * scaledSize, 1);
      countSprite.position.y = -1.2 * scaledSize;
      group.add(countSprite);

      // Position bubbles in a circle
      const angle = (index / topics.length) * Math.PI * 2;
      const radius = 5;
      group.position.x = Math.cos(angle) * radius;
      group.position.y = Math.sin(angle) * radius;
      
      // Add floating animation data
      group.userData = {
        id: topic.id,
        originalX: group.position.x,
        originalY: group.position.y,
        phase: Math.random() * Math.PI * 2
      };

      bubblesRef.current[topic.id] = group;
      scene.add(group);
    });

    // Animation
    const animate = () => {
      const time = Date.now() * 0.001;

      // Update bubble positions with floating animation
      Object.values(bubblesRef.current).forEach(group => {
        const { originalX, originalY, phase } = group.userData;
        group.position.x = originalX + Math.sin(time + phase) * 0.3;
        group.position.y = originalY + Math.cos(time + phase) * 0.3;
        group.quaternion.copy(camera.quaternion);
      });

      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Handle click events
    const handleClick = (event: MouseEvent) => {
      if (mouseRef.current.isDragging) return;

      const rect = container.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / width) * 2 - 1;
      const y = -((event.clientY - rect.top) / height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

      const intersects = raycaster.intersectObjects(scene.children, true);
      if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj.parent && !(obj.userData?.id)) {
          obj = obj.parent;
        }
        if (obj.userData?.id) {
          onBubbleClick(obj.userData.id);
        }
      }
    };

    container.addEventListener('click', handleClick);

    return () => {
      container.removeEventListener('click', handleClick);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [topics, onBubbleClick]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full"
      style={{ touchAction: 'none' }}
    />
  );
};

export default BubbleWorld;
