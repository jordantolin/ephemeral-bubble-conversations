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
  const { isInteractingRef, targetRotationRef, dragStartRef, isDraggingRef } = useBubbleInteraction();
  const { handleMouseDown, handleMouseMove, handleMouseUp, handleWheel, updateCamera, handlePinchZoom } = useCameraControls();

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

    // Lights setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 1, 1);
    scene.add(directionalLight);

    // Central world setup
    const centralWorldGeometry = createCentralWorldGeometry();
    const centralWorldMaterial = createCentralWorldMaterial();
    const centralWorld = new THREE.Mesh(centralWorldGeometry, centralWorldMaterial);
    scene.add(centralWorld);

    // Bubble creation and positioning
    topics.forEach((topic, index) => {
      const bubbleGeometry = createBubbleGeometry(typeof topic.size === 'number' ? topic.size : 1);
      const bubbleMaterial = createBubbleMaterial();
      const textCanvas = createTextCanvas(topic.topic);

      // Create a material using the canvas directly
      const textMaterial = new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(textCanvas),
        transparent: true
      });

      const textGeometry = new THREE.PlaneGeometry(5, 1);
      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      textMesh.position.set(0, 0, 2);

      const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
      const bubbleGroup = new THREE.Group();
      bubbleGroup.add(bubble);
      bubbleGroup.add(textMesh);

      const radius = 10;
      const angle = (index / topics.length) * Math.PI * 2;
      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle);
      const y = Math.sin(index) * 2;

      bubbleGroup.position.set(x, y, z);
      bubbleGroup.lookAt(0, 0, 0);
      bubbleGroup.name = `bubble-${topic.id}`;
      bubbleGroup.userData = { id: topic.id };
      bubblesRef.current[topic.id] = bubbleGroup;
      scene.add(bubbleGroup);

      // Initial animation
      const initialRotation = { y: Math.random() * Math.PI * 2 };
      const targetRotation = { y: 0 };

      new TWEEN.Tween(initialRotation)
        .to(targetRotation, 1000)
        .onUpdate(() => {
          bubbleGroup.rotation.y = initialRotation.y;
        })
        .start();
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let startPosition = { x: 0, y: 0 };
    let clickTime = 0;

    const handleBubbleClick = (x: number, y: number) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((x - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((y - rect.top) / rect.height) * 2 + 1;

      if (cameraRef.current) {
        raycaster.setFromCamera(mouse, cameraRef.current);
        const intersects = raycaster.intersectObjects(scene.children, true);

        if (intersects.length > 0) {
          const bubble = intersects[0].object;
          let bubbleGroup = bubble.parent;
          
          while (bubbleGroup && !(bubbleGroup instanceof THREE.Group)) {
            bubbleGroup = bubbleGroup.parent;
          }
          
          if (bubbleGroup && bubbleGroup.userData.id) {
            console.log('Bubble clicked:', bubbleGroup.userData.id);
            onBubbleClick(bubbleGroup.userData.id);
          }
        }
      }
    };

    const touchOptions: AddEventListenerOptions = { capture: false };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        startPosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        clickTime = Date.now();
        isDraggingRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - startPosition.x);
        const deltaY = Math.abs(touch.clientY - startPosition.y);
        if (deltaX > 5 || deltaY > 5) {
          isDraggingRef.current = true;
        }
        handleMouseMove(touch as unknown as MouseEvent);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      const endTime = Date.now();
      const touchDuration = endTime - clickTime;
      
      if (!isDraggingRef.current && touchDuration < 200 && e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        handleBubbleClick(touch.clientX, touch.clientY);
      }
      handleMouseUp();
      isDraggingRef.current = false;
    };

    const handleMouseClick = (e: MouseEvent) => {
      if (!isDraggingRef.current) {
        handleBubbleClick(e.clientX, e.clientY);
      }
    };

    // Add event listeners
    container.addEventListener('touchstart', handleTouchStart, touchOptions);
    container.addEventListener('touchmove', handleTouchMove, touchOptions);
    container.addEventListener('touchend', handleTouchEnd, touchOptions);
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('click', handleMouseClick);

    // Set up the animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      if (camera) {
        updateCamera(camera);
      }
      TWEEN.update();
      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      container.removeEventListener('touchstart', handleTouchStart, touchOptions);
      container.removeEventListener('touchmove', handleTouchMove, touchOptions);
      container.removeEventListener('touchend', handleTouchEnd, touchOptions);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('click', handleMouseClick);
      
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
