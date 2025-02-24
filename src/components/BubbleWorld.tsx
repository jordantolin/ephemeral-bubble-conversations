
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { BubbleWorldProps } from '@/types/bubble';
import { createBubbleGeometry, createBubbleMaterial } from '@/utils/bubbleUtils';
import { useBubbleInteraction } from '@/hooks/useBubbleInteraction';
import { useCameraControls } from '@/hooks/useCameraControls';

const BubbleWorld = ({ topics, onBubbleClick }: BubbleWorldProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bubblesRef = useRef<{ [key: string]: THREE.Group }>({});
  const sceneRef = useRef<THREE.Scene | null>(null);
  const animationFrameRef = useRef<number>();
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const planetRef = useRef<THREE.Mesh | null>(null);
  const { isInteractingRef, targetRotationRef, dragStartRef, isDraggingRef, handleReflect } = useBubbleInteraction();
  const { handleMouseDown, handleMouseMove, handleMouseUp, handleWheel, updateCamera } = useCameraControls();

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color('#FEF7E4');

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Adjust camera FOV for mobile
    const isMobile = width < 768;
    const fov = isMobile ? 60 : 45;
    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 1000);
    camera.position.z = isMobile ? 12 : 16;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight('#FFFFFF', 2);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight('#FFFFFF', 2.5);
    mainLight.position.set(10, 10, 10);
    scene.add(mainLight);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Handle bubble clicks
    const handleClick = (event: MouseEvent) => {
      if (isDraggingRef.current) return;

      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const bubble = intersects[0].object;
        const bubbleGroup = bubble.parent;
        if (bubbleGroup && bubbleGroup.userData.id) {
          onBubbleClick(bubbleGroup.userData.id);
        }
      }
    };

    container.addEventListener('click', handleClick);

    topics.forEach((topic, index) => {
      const bubbleGroup = new THREE.Group();
      
      const baseSize = topic.size === 'lg' ? 0.8 : 
                      topic.size === 'md' ? 0.6 : 0.4;
      const reflectScale = 1 + (topic.reflect_count * 0.1);
      const finalSize = baseSize * reflectScale;
      
      const geometry = createBubbleGeometry(finalSize);
      const material = createBubbleMaterial();
      const bubble = new THREE.Mesh(geometry, material);
      bubbleGroup.add(bubble);

      // Position bubbles in a circle with adjusted radius for mobile
      const radius = isMobile ? 5 : 6;
      const angle = (index / topics.length) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius * 0.8; // Flatten circle slightly
      const z = Math.sin(angle) * radius * 0.6;
      bubbleGroup.position.set(x, y, z);

      bubbleGroup.userData = {
        id: topic.id,
        reflectCount: topic.reflect_count
      };

      bubbleGroup.lookAt(new THREE.Vector3(0, 0, 0));
      bubblesRef.current[topic.id] = bubbleGroup;
      scene.add(bubbleGroup);
    });

    const animate = () => {
      if (!rendererRef.current || !cameraRef.current || !sceneRef.current) return;
      animationFrameRef.current = requestAnimationFrame(animate);
      
      updateCamera(cameraRef.current);
      TWEEN.update();

      // Rotate bubbles to face camera
      Object.values(bubblesRef.current).forEach(bubbleGroup => {
        bubbleGroup.quaternion.copy(camera.quaternion);
      });

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Touch events for mobile
    container.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleMouseDown(touch);
    });

    container.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleMouseMove(touch);
    });

    container.addEventListener('touchend', () => {
      handleMouseUp();
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('click', handleClick);
      container.removeEventListener('touchstart', handleMouseDown as any);
      container.removeEventListener('touchmove', handleMouseMove as any);
      container.removeEventListener('touchend', handleMouseUp);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
        container.removeChild(rendererRef.current.domElement);
      }
    };
  }, [topics, onBubbleClick, handleReflect, handleMouseDown, handleMouseMove, handleMouseUp, handleWheel, updateCamera]);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 touch-none select-none"
      style={{ 
        touchAction: 'none',
        WebkitTapHighlightColor: 'transparent'
      }}
    />
  );
};

export default BubbleWorld;
