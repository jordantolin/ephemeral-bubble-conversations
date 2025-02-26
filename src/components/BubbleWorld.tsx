
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

    // Camera setup with wider field of view for mobile
    const camera = new THREE.PerspectiveCamera(85, width / height, 0.1, 1000);
    camera.position.z = 8; // Closer camera for better mobile visibility
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance' // Better mobile performance
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for better performance
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Enhanced lighting for mobile
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(0, 5, 8);
    scene.add(directionalLight);

    // Create bubbles with mobile-optimized sizes
    topics.forEach((topic, index) => {
      const group = new THREE.Group();
      
      // Smaller sizes for mobile screens
      const size = topic.size === 'lg' ? 0.6 : 
                   topic.size === 'md' ? 0.45 : 0.35;
      const scaledSize = size * (1 + topic.reflect_count * 0.05);
      
      const geometry = createBubbleGeometry(scaledSize);
      const material = createBubbleMaterial();
      const bubble = new THREE.Mesh(geometry, material);
      group.add(bubble);

      // Optimized text sizes for mobile
      const nameTexture = new THREE.CanvasTexture(createTextCanvas(topic.name, 24));
      const nameSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: nameTexture }));
      nameSprite.scale.set(1.8 * scaledSize, 0.9 * scaledSize, 1);
      nameSprite.position.y = 1 * scaledSize;
      group.add(nameSprite);

      const countTexture = new THREE.CanvasTexture(createTextCanvas(`✨ ${topic.reflect_count}`, 20));
      const countSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: countTexture }));
      countSprite.scale.set(1.8 * scaledSize, 0.9 * scaledSize, 1);
      countSprite.position.y = -1 * scaledSize;
      group.add(countSprite);

      // Tighter circle arrangement for mobile
      const angle = (index / topics.length) * Math.PI * 2;
      const radius = 4; // Smaller radius for mobile
      group.position.x = Math.cos(angle) * radius;
      group.position.y = Math.sin(angle) * radius;
      
      group.userData = {
        id: topic.id,
        originalX: group.position.x,
        originalY: group.position.y,
        phase: Math.random() * Math.PI * 2
      };

      bubblesRef.current[topic.id] = group;
      scene.add(group);
    });

    // Smoother animation for mobile
    const animate = () => {
      const time = Date.now() * 0.0008; // Slower animation for better performance

      Object.values(bubblesRef.current).forEach(group => {
        const { originalX, originalY, phase } = group.userData;
        group.position.x = originalX + Math.sin(time + phase) * 0.2;
        group.position.y = originalY + Math.cos(time + phase) * 0.2;
        group.quaternion.copy(camera.quaternion);
      });

      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Touch event handling
    let touchStartX = 0;
    let touchStartY = 0;
    let isTouching = false;

    const handleTouchStart = (event: TouchEvent) => {
      event.preventDefault();
      isTouching = true;
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    };

    const handleTouchEnd = (event: TouchEvent) => {
      event.preventDefault();
      if (isTouching) {
        const touchEndX = event.changedTouches[0].clientX;
        const touchEndY = event.changedTouches[0].clientY;
        
        // Only trigger click if it's a tap (minimal movement)
        if (Math.abs(touchEndX - touchStartX) < 10 && 
            Math.abs(touchEndY - touchStartY) < 10) {
          const rect = container.getBoundingClientRect();
          const x = ((touchEndX - rect.left) / width) * 2 - 1;
          const y = -((touchEndY - rect.top) / height) * 2 + 1;

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
        }
      }
      isTouching = false;
    };

    // Add touch events
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
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
      className="w-full h-full touch-none"
      style={{ touchAction: 'none' }}
    />
  );
};

export default BubbleWorld;
