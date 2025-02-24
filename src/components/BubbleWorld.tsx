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

// Helper function to convert touch to mouse-like event
const touchToMouseEvent = (touch: Touch): Partial<MouseEvent> => ({
  clientX: touch.clientX,
  clientY: touch.clientY,
  preventDefault: () => {},
  stopPropagation: () => {}
});

const BubbleWorld = ({ topics, onBubbleClick }: BubbleWorldProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bubblesRef = useRef<{ [key: string]: THREE.Group }>({});
  const sceneRef = useRef<THREE.Scene | null>(null);
  const animationFrameRef = useRef<number>();
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
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

    const isMobile = width < 768;
    const fov = isMobile ? 75 : 45;
    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 1000);
    camera.position.z = isMobile ? 8 : 12;
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

    // Enhanced lighting for better 3D effect
    const ambientLight = new THREE.AmbientLight('#FFFFFF', 1.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight('#FFFFFF', 2);
    mainLight.position.set(10, 10, 10);
    scene.add(mainLight);

    const backLight = new THREE.DirectionalLight('#FFFFFF', 1);
    backLight.position.set(-10, -10, -10);
    scene.add(backLight);

    // Add central white world sphere
    const worldGeometry = createCentralWorldGeometry();
    const worldMaterial = createCentralWorldMaterial();
    const centralWorld = new THREE.Mesh(worldGeometry, worldMaterial);
    scene.add(centralWorld);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Handle bubble clicks
    const handleClick = (event: MouseEvent | TouchEvent) => {
      if (isDraggingRef.current) return;

      const rect = container.getBoundingClientRect();
      const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
      const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

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

    // Create bubbles with improved spacing and text positioning
    topics.forEach((topic, index) => {
      const bubbleGroup = new THREE.Group();
      
      const baseSize = topic.size === 'lg' ? 0.8 : 
                      topic.size === 'md' ? 0.6 : 0.4;
      const reflectScale = 1 + (topic.reflect_count * 0.1);
      const finalSize = baseSize * reflectScale;
      
      // Create main bubble
      const geometry = createBubbleGeometry(finalSize);
      const material = createBubbleMaterial();
      const bubble = new THREE.Mesh(geometry, material);
      bubbleGroup.add(bubble);

      // Create bubble name text sprite
      const textTexture = createTextCanvas(topic.name);
      const spriteMaterial = new THREE.SpriteMaterial({ 
        map: textTexture,
        transparent: true,
        opacity: 1,
        depthTest: false
      });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(finalSize * 2.5, finalSize * 1.25, 1);
      sprite.position.y = finalSize * 1.2;
      bubbleGroup.add(sprite);

      // Add username text
      const userTexture = createTextCanvas(`by ${topic.username}`, 32);
      const userMaterial = new THREE.SpriteMaterial({
        map: userTexture,
        transparent: true,
        opacity: 1,
        depthTest: false
      });
      const userSprite = new THREE.Sprite(userMaterial);
      userSprite.scale.set(finalSize * 2, finalSize * 0.8, 1);
      userSprite.position.y = finalSize * 0.6;
      bubbleGroup.add(userSprite);

      // Add topic text
      const topicTexture = createTextCanvas(topic.topic, 32);
      const topicMaterial = new THREE.SpriteMaterial({
        map: topicTexture,
        transparent: true,
        opacity: 1,
        depthTest: false
      });
      const topicSprite = new THREE.Sprite(topicMaterial);
      topicSprite.scale.set(finalSize * 2, finalSize * 0.8, 1);
      topicSprite.position.y = finalSize * 0.2;
      bubbleGroup.add(topicSprite);

      // Add reflect count text
      const reflectTexture = createTextCanvas(`⭐ ${topic.reflect_count}`, 36);
      const reflectMaterial = new THREE.SpriteMaterial({
        map: reflectTexture,
        transparent: true,
        opacity: 1,
        depthTest: false
      });
      const reflectSprite = new THREE.Sprite(reflectMaterial);
      reflectSprite.scale.set(finalSize * 2, finalSize * 0.8, 1);
      reflectSprite.position.y = finalSize * -0.2;
      bubbleGroup.add(reflectSprite);

      // Position bubbles very close to the central world
      const totalBubbles = topics.length;
      const radius = isMobile ? 2.5 : 3; // Even closer to the central world
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

      // Make bubble group always face camera
      bubbleGroup.lookAt(new THREE.Vector3(0, 0, 0));
      bubblesRef.current[topic.id] = bubbleGroup;
      scene.add(bubbleGroup);
    });

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

    // Mouse wheel for zoom
    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault();
      handleWheel(e);
    };

    container.addEventListener('wheel', handleWheelEvent);

    // Touch event handlers
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEventLike = touchToMouseEvent(touch);
      handleMouseDown(mouseEventLike as MouseEvent);
      isDraggingRef.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!isDraggingRef.current) return;
      const touch = e.touches[0];
      const mouseEventLike = touchToMouseEvent(touch);
      handleMouseMove(mouseEventLike as MouseEvent);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      isDraggingRef.current = false;
      handleMouseUp();
    };

    // Add all event listeners
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);

    // Animation loop with smooth rotation
    const animate = () => {
      if (!rendererRef.current || !cameraRef.current || !sceneRef.current) return;
      
      animationFrameRef.current = requestAnimationFrame(animate);
      
      updateCamera(cameraRef.current);
      
      // Rotate central world slowly
      centralWorld.rotation.y += 0.001;
      
      TWEEN.update();

      // Make text always face camera
      Object.values(bubblesRef.current).forEach(bubbleGroup => {
        const cameraPos = cameraRef.current!.position;
        bubbleGroup.children.forEach((child, index) => {
          if (child instanceof THREE.Sprite) {
            child.lookAt(cameraPos);
          }
        });
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('wheel', handleWheelEvent);
      container.removeEventListener('click', handleClick);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
      
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
