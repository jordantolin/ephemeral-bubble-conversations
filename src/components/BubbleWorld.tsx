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
  const isCleanedUpRef = useRef(false);
  const { isInteractingRef, targetRotationRef, dragStartRef, isDraggingRef, handleReflect } = useBubbleInteraction();
  const { zoomRef, handleWheel } = useCameraControls();

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Reset cleanup flag on mount
    isCleanedUpRef.current = false;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color('#FEF7E4');

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
    
    // Only append if container exists and doesn't already have a canvas
    if (!containerRef.current.querySelector('canvas')) {
      containerRef.current.appendChild(renderer.domElement);
    }
    rendererRef.current = renderer;

    // Add lighting
    const ambientLight = new THREE.AmbientLight('#FFFFFF', 2);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight('#FFFFFF', 2.5);
    mainLight.position.set(10, 10, 10);
    scene.add(mainLight);

    // Create central planet (white)
    const planetGeometry = new THREE.SphereGeometry(3, 32, 32);
    const planetMaterial = new THREE.MeshPhongMaterial({
      color: 0xFFFFFF,
      emissive: 0xFFFFFF,
      emissiveIntensity: 0.1,
      shininess: 100
    });
    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
    scene.add(planet);
    planetRef.current = planet;

    // Create bubbles closer to the planet
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

      // Create text sprite that always faces camera with black text
      const createText = (text: string, yOffset: number, fontSize: number) => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d')!;
        
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.font = `bold ${fontSize}px Inter`;
        
        // Draw black text
        context.fillStyle = '#000000';
        context.fillText(text, canvas.width / 2, canvas.height / 2 + yOffset);
        
        return canvas;
      };

      const nameCanvas = createText(topic.name, -30, 48);
      const topicCanvas = createText(topic.topic, 30, 32);
      
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = 512;
      finalCanvas.height = 512;
      const finalContext = finalCanvas.getContext('2d')!;
      finalContext.drawImage(nameCanvas, 0, 0);
      finalContext.drawImage(topicCanvas, 0, 0);

      const textTexture = new THREE.CanvasTexture(finalCanvas);
      textTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      
      const textMaterial = new THREE.SpriteMaterial({
        map: textTexture,
        transparent: true,
        depthWrite: false
      });

      const textSprite = new THREE.Sprite(textMaterial);
      textSprite.scale.set(finalSize * 2.5, finalSize * 2.5, 1); // Increased text size
      textSprite.position.z = finalSize * 1.1;
      bubbleGroup.add(textSprite);

      // Position bubbles even closer to planet
      const radius = 4; // Reduced radius
      const angle = (index / topics.length) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius * 0.8;
      const z = Math.sin(angle) * radius * 0.6;
      bubbleGroup.position.set(x, y, z);
      
      bubbleGroup.userData = {
        id: topic.id,
        reflectCount: topic.reflect_count,
        orbitAngle: angle,
        orbitSpeed: 0.0001 + Math.random() * 0.0002, // Slower orbit
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: 0.0005 + Math.random() * 0.0005, // Slower floating
        floatAmplitude: 0.15 + Math.random() * 0.15 // More pronounced floating
      };

      bubbleGroup.lookAt(new THREE.Vector3(0, 0, 0));
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

    // Animation loop with smoother movement
    const animate = () => {
      // Only continue animation if not cleaned up
      if (isCleanedUpRef.current) return;
      
      animationFrameRef.current = requestAnimationFrame(animate);
      
      if (!rendererRef.current || !cameraRef.current || !sceneRef.current || !planetRef.current) return;

      TWEEN.update();

      // Rotate planet
      if (planetRef.current) {
        planetRef.current.rotation.y += 0.001;
      }

      sceneRef.current.rotation.x += (targetRotationRef.current.x - sceneRef.current.rotation.x) * 0.1;
      sceneRef.current.rotation.y += (targetRotationRef.current.y - sceneRef.current.rotation.y) * 0.1;

      zoomRef.current.current += (zoomRef.current.target - zoomRef.current.current) * 0.1;
      if (cameraRef.current) {
        cameraRef.current.position.z = zoomRef.current.current;
      }

      const time = Date.now() * 0.001;
      Object.values(bubblesRef.current).forEach(bubbleGroup => {
        if (bubbleGroup.userData.orbitAngle !== undefined) {
          bubbleGroup.userData.orbitAngle += bubbleGroup.userData.orbitSpeed;
          const radius = 4; // Keep same reduced radius
          const x = Math.cos(bubbleGroup.userData.orbitAngle) * radius;
          const y = Math.sin(bubbleGroup.userData.orbitAngle) * radius * 0.8 + 
                   Math.sin(time * bubbleGroup.userData.floatSpeed + bubbleGroup.userData.floatOffset) * 
                   bubbleGroup.userData.floatAmplitude;
          const z = Math.sin(bubbleGroup.userData.orbitAngle) * radius * 0.6;
          
          bubbleGroup.position.set(x, y, z);
          bubbleGroup.lookAt(new THREE.Vector3(0, 0, 0));
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup function
    return () => {
      // Prevent multiple cleanups
      if (isCleanedUpRef.current) return;
      isCleanedUpRef.current = true;

      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Clean up Three.js resources
      if (rendererRef.current) {
        // Dispose of renderer
        rendererRef.current.dispose();
        
        // Only try to remove if the container and canvas exist
        const canvas = rendererRef.current.domElement;
        if (containerRef.current && canvas && containerRef.current.contains(canvas)) {
          containerRef.current.removeChild(canvas);
        }
        rendererRef.current = null;
      }

      // Clean up scene resources
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (object.material instanceof THREE.Material) {
              object.material.dispose();
            } else if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            }
          }
        });
        sceneRef.current = null;
      }

      // Clean up other references
      bubblesRef.current = {};
      cameraRef.current = null;
      planetRef.current = null;

      // Remove wheel event listener
      containerRef.current?.removeEventListener('wheel', handleWheel);
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
