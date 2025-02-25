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
  const { isInteractingRef, targetRotationRef, dragStartRef, isDraggingRef, handleReflect } = useBubbleInteraction();
  const { handleMouseDown, handleMouseMove, handleMouseUp, handleWheel, updateCamera, handlePinchZoom, mouseRef } = useCameraControls();

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color('#FEF7E4');

    const width = container.clientWidth;
    const height = container.clientHeight;

    const isMobile = width < 768;
    const fov = isMobile ? 75 : 45;
    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 1000);
    camera.position.z = isMobile ? 10 : 16;
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

    // Enhanced lighting
    const ambientLight = new THREE.AmbientLight('#FFFFFF', 1.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight('#FFFFFF', 2);
    mainLight.position.set(10, 10, 10);
    scene.add(mainLight);

    const backLight = new THREE.DirectionalLight('#FFFFFF', 1);
    backLight.position.set(-10, -10, -10);
    scene.add(backLight);

    // Central world
    const worldGeometry = createCentralWorldGeometry();
    const worldMaterial = createCentralWorldMaterial();
    const centralWorld = new THREE.Mesh(worldGeometry, worldMaterial);
    scene.add(centralWorld);

    // Create bubbles
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

      // Create text sprites using canvas
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

      // Add text sprites
      bubbleGroup.add(createSprite(topic.name, 1.2, 48));
      bubbleGroup.add(createSprite(`by ${topic.username}`, 0.6));
      bubbleGroup.add(createSprite(topic.topic, 0.2));
      bubbleGroup.add(createSprite(`⭐ ${topic.reflect_count}`, -0.2));

      // Position bubble
      const totalBubbles = topics.length;
      const radius = isMobile ? 3 : 4;
      const phi = Math.acos(-1 + (2 * index) / totalBubbles);
      const theta = Math.sqrt(totalBubbles * Math.PI) * phi;

      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);

      bubbleGroup.position.set(x, y, z);
      bubbleGroup.userData = {
        id: topic.id,
        reflectCount: topic.reflect_count
      };

      bubbleGroup.lookAt(new THREE.Vector3(0, 0, 0));
      bubblesRef.current[topic.id] = bubbleGroup;
      scene.add(bubbleGroup);
    });

    // Raycaster for bubble interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleInteraction = (event: MouseEvent | Touch) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        let bubbleGroup = intersects[0].object;
        while (bubbleGroup && !(bubbleGroup instanceof THREE.Group)) {
          bubbleGroup = bubbleGroup.parent!;
        }
        
        if (bubbleGroup && bubbleGroup.userData.id) {
          console.log('Bubble clicked:', bubbleGroup.userData.id);
          onBubbleClick(bubbleGroup.userData.id);
        }
      }
    };

    // Touch event handlers
    let touchStartTime = 0;
    let touchStartPos = { x: 0, y: 0 };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      touchStartTime = Date.now();
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        touchStartPos = { x: touch.clientX, y: touch.clientY };
        handleMouseDown(touch as unknown as MouseEvent);
      } else if (e.touches.length === 2) {
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        mouseRef.current.lastPinchDistance = Math.sqrt(dx * dx + dy * dy);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        handleMouseMove(e.touches[0] as unknown as MouseEvent);
      } else if (e.touches.length === 2) {
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        handlePinchZoom(distance);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      const touchEndTime = Date.now();
      const touchDuration = touchEndTime - touchStartTime;

      if (e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        const deltaX = Math.abs(touch.clientX - touchStartPos.x);
        const deltaY = Math.abs(touch.clientY - touchStartPos.y);

        // If it was a short touch and didn't move much, treat it as a tap
        if (touchDuration < 300 && deltaX < 10 && deltaY < 10) {
          handleInteraction(touch);
        }
      }

      handleMouseUp();
      mouseRef.current.lastPinchDistance = 0;
    };

    // Mouse event handlers
    const handleClick = (e: MouseEvent) => {
      if (!mouseRef.current.isDragging) {
        handleInteraction(e);
      }
    };

    // Add event listeners
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('click', handleClick);
    container.addEventListener('wheel', handleWheel, { passive: false });

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

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      if (camera) {
        updateCamera(camera);
      }

      // Make text sprites face camera
      Object.values(bubblesRef.current).forEach(bubbleGroup => {
        bubbleGroup.children.forEach((child, index) => {
          if (child instanceof THREE.Sprite) {
            child.lookAt(camera.position);
          }
        });
      });
      
      centralWorld.rotation.y += 0.001;
      TWEEN.update();
      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('click', handleClick);
      container.removeEventListener('wheel', handleWheel);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
        container.removeChild(rendererRef.current.domElement);
      }
    };
  }, [topics, onBubbleClick, handleMouseDown, handleMouseMove, handleMouseUp, handleWheel, updateCamera, handlePinchZoom]);

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
