
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { BubbleWorldProps } from '@/types/bubble';
import { 
  createBubbleGeometry, 
  createBubbleMaterial, 
  createTextCanvas,
  createCentralWorldGeometry,
  createCentralWorldMaterial 
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
  const touchRef = useRef({ 
    isDragging: false,
    lastX: 0,
    lastY: 0,
    startTime: 0
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color('#FEF7E4');

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Mobile-optimized camera
    const isMobile = width < 768;
    const camera = new THREE.PerspectiveCamera(
      isMobile ? 75 : 60,
      width / height,
      0.1,
      1000
    );
    camera.position.z = isMobile ? 8 : 12;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Enhanced lighting for better mobile visibility
    const ambientLight = new THREE.AmbientLight('#FFFFFF', 1.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight('#FFFFFF', 2);
    mainLight.position.set(10, 10, 10);
    scene.add(mainLight);

    const backLight = new THREE.DirectionalLight('#FFFFFF', 1);
    backLight.position.set(-10, -10, -10);
    scene.add(backLight);

    // Add Earth-like central world
    const worldGeometry = createCentralWorldGeometry();
    const worldMaterial = createCentralWorldMaterial();
    const centralWorld = new THREE.Mesh(worldGeometry, worldMaterial);
    scene.add(centralWorld);

    // Create bubbles with improved text visibility
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

      // Add text sprites with better visibility
      const createSprite = (text: string, yOffset: number, fontSize: number = 32) => {
        const canvas = createTextCanvas(text, fontSize);
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        const spriteMaterial = new THREE.SpriteMaterial({ 
          map: texture,
          transparent: true,
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(finalSize * 2.5, finalSize * 1.25, 1);
        sprite.position.y = finalSize * yOffset;
        return sprite;
      };

      // Add layered text for better readability
      bubbleGroup.add(createSprite(topic.name, 1.2, isMobile ? 36 : 48));
      bubbleGroup.add(createSprite(topic.topic, 0.2, isMobile ? 28 : 32));
      bubbleGroup.add(createSprite(`⭐ ${topic.reflect_count}`, -0.8, isMobile ? 24 : 28));

      // Position bubbles in a spiral pattern around the central world
      const angle = (index / topics.length) * Math.PI * 2;
      const spiralRadius = 4 + (index * 0.2);
      const x = spiralRadius * Math.cos(angle);
      const y = spiralRadius * Math.sin(angle);
      const z = (index * 0.2) - 2;

      bubbleGroup.position.set(x, y, z);
      bubbleGroup.userData = {
        id: topic.id,
        initialPosition: { x, y, z },
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: 0.0005 + Math.random() * 0.0005
      };

      bubblesRef.current[topic.id] = bubbleGroup;
      scene.add(bubbleGroup);
    });

    // Touch interaction handlers
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      touchRef.current = {
        isDragging: false,
        lastX: touch.clientX,
        lastY: touch.clientY,
        startTime: Date.now()
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchRef.current.lastX;
      const deltaY = touch.clientY - touchRef.current.lastY;

      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        touchRef.current.isDragging = true;
        
        // Rotate scene based on touch movement
        centralWorld.rotation.y += deltaX * 0.005;
        centralWorld.rotation.x += deltaY * 0.005;

        // Move bubbles with the rotation
        Object.values(bubblesRef.current).forEach(bubble => {
          bubble.rotation.y += deltaX * 0.005;
          bubble.rotation.x += deltaY * 0.005;
        });
      }

      touchRef.current.lastX = touch.clientX;
      touchRef.current.lastY = touch.clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      const touchDuration = Date.now() - touchRef.current.startTime;

      if (!touchRef.current.isDragging && touchDuration < 200) {
        const touch = e.changedTouches[0];
        const rect = container.getBoundingClientRect();
        const x = ((touch.clientX - rect.left) / width) * 2 - 1;
        const y = -((touch.clientY - rect.top) / height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
        
        const intersects = raycaster.intersectObjects(scene.children, true);
        if (intersects.length > 0) {
          let bubbleGroup = intersects[0].object;
          while (bubbleGroup && !(bubbleGroup instanceof THREE.Group)) {
            bubbleGroup = bubbleGroup.parent!;
          }
          
          if (bubbleGroup?.userData?.id) {
            onBubbleClick(bubbleGroup.userData.id);
          }
        }
      }
    };

    // Add touch event listeners
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      // Gentle rotation of central world
      centralWorld.rotation.y += 0.001;

      // Floating animation for bubbles
      Object.values(bubblesRef.current).forEach(bubble => {
        const { initialPosition, floatOffset, floatSpeed } = bubble.userData;
        const time = Date.now() * floatSpeed;
        
        bubble.position.x = initialPosition.x + Math.sin(time + floatOffset) * 0.2;
        bubble.position.y = initialPosition.y + Math.cos(time + floatOffset) * 0.2;
        bubble.quaternion.copy(camera.quaternion);
      });

      TWEEN.update();
      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
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
      className="w-full h-full touch-none select-none"
      style={{ touchAction: 'none' }}
    />
  );
};

export default BubbleWorld;
