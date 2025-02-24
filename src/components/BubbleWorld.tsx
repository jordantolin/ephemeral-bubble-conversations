import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { BubbleWorldProps } from '@/types/bubble';
import { createBubbleGeometry, createBubbleMaterial, createTextCanvas, calculateBubblePosition } from '@/utils/bubbleUtils';
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
  const { zoomRef, handleWheel } = useCameraControls();

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color('#FFFFFF');

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 16;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1.0);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xFFFFFF, 1.5);
    mainLight.position.set(10, 10, 10);
    scene.add(mainLight);

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

      const textCanvas = createTextCanvas(topic, reflectScale);
      const textTexture = new THREE.CanvasTexture(textCanvas);
      textTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      
      const textMaterial = new THREE.MeshBasicMaterial({
        map: textTexture,
        transparent: true,
        depthTest: false,
        side: THREE.DoubleSide,
      });

      const textGeometry = new THREE.PlaneGeometry(finalSize * 3, finalSize * 3);
      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      textMesh.position.z = finalSize * 1.1;
      bubbleGroup.add(textMesh);

      const position = calculateBubblePosition(index, topics.length, 6);
      bubbleGroup.position.set(position.x, position.y, position.z);
      
      // Add floating animation parameters
      bubbleGroup.userData = {
        id: topic.id,
        reflectCount: topic.reflect_count,
        orbitAngle: position.angle,
        orbitSpeed: 0.0005,
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: 0.001 + Math.random() * 0.001,
        floatAmplitude: 0.1 + Math.random() * 0.1
      };

      bubbleGroup.lookAt(camera.position);
      bubblesRef.current[topic.id] = bubbleGroup;
      scene.add(bubbleGroup);
    });

    const handleMouseDown = (event: MouseEvent) => {
      isDraggingRef.current = true;
      dragStartRef.current = {
        x: event.clientX,
        y: event.clientY
      };
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const deltaX = event.clientX - dragStartRef.current.x;
      const deltaY = event.clientY - dragStartRef.current.y;

      targetRotationRef.current.y += deltaX * 0.005;
      targetRotationRef.current.x += deltaY * 0.005;

      targetRotationRef.current.x = Math.max(
        -Math.PI / 3,
        Math.min(Math.PI / 3, targetRotationRef.current.x)
      );

      dragStartRef.current = {
        x: event.clientX,
        y: event.clientY
      };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    containerRef.current.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    containerRef.current.addEventListener('wheel', handleWheel, { passive: false });

    // Update the dblclick handler to use onBubbleClick prop
    containerRef.current.addEventListener('dblclick', (event) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );

      if (cameraRef.current && sceneRef.current) {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, cameraRef.current);
        const intersects = raycaster.intersectObjects(sceneRef.current.children, true);

        for (const intersect of intersects) {
          let current = intersect.object;
          while (current.parent) {
            if (current.userData?.id) {
              handleReflect(current.userData.id, bubblesRef.current);
              onBubbleClick(current.userData.id); // Call the provided click handler
              return;
            }
            current = current.parent;
          }
        }
      }
    });

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      if (!rendererRef.current || !cameraRef.current || !sceneRef.current) return;

      TWEEN.update();

      sceneRef.current.rotation.x += (targetRotationRef.current.x - sceneRef.current.rotation.x) * 0.1;
      sceneRef.current.rotation.y += (targetRotationRef.current.y - sceneRef.current.rotation.y) * 0.1;

      zoomRef.current.current += (zoomRef.current.target - zoomRef.current.current) * 0.1;
      if (cameraRef.current) {
        cameraRef.current.position.z = zoomRef.current.current;
      }

      const time = Date.now() * 0.001;
      Object.values(bubblesRef.current).forEach(bubbleGroup => {
        // Update floating animation
        const floatY = Math.sin(time * bubbleGroup.userData.floatSpeed + bubbleGroup.userData.floatOffset) * bubbleGroup.userData.floatAmplitude;
        const originalY = bubbleGroup.position.y;
        bubbleGroup.position.y = originalY + floatY;

        // Update orbital rotation
        if (bubbleGroup.userData.orbitAngle !== undefined) {
          bubbleGroup.userData.orbitAngle += bubbleGroup.userData.orbitSpeed;
          const radius = bubbleGroup.position.length();
          bubbleGroup.position.x = Math.cos(bubbleGroup.userData.orbitAngle) * radius;
          bubbleGroup.position.z = Math.sin(bubbleGroup.userData.orbitAngle) * radius;
          bubbleGroup.lookAt(camera.position);
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }

      containerRef.current?.removeEventListener('wheel', handleWheel);
      containerRef.current?.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [topics, onBubbleClick, handleReflect, handleWheel]);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 touch-none overscroll-none select-none"
      style={{ 
        touchAction: 'none',
        WebkitTapHighlightColor: 'transparent'
      }}
    />
  );
};

export default BubbleWorld;
