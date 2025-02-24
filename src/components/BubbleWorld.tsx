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
  const { zoomRef, panRef, handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd } = useCameraControls();

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

      // Create text that always faces camera with better readability
      const createTextTexture = (text: string, fontSize: number) => {
        const canvas = document.createElement('canvas');
        const size = 512; // Increased canvas size for better text quality
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d')!;
        
        // Clear background
        context.fillStyle = 'rgba(0,0,0,0)';
        context.fillRect(0, 0, size, size);
        
        // Set up text style
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.font = `bold ${fontSize}px Inter`;
        
        // Add white outline for better contrast
        context.strokeStyle = '#FFFFFF';
        context.lineWidth = fontSize * 0.1;
        context.lineJoin = 'round';
        context.strokeText(text, size / 2, size / 2);
        
        // Draw black text
        context.fillStyle = '#000000';
        context.fillText(text, size / 2, size / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = rendererRef.current!.capabilities.getMaxAnisotropy();
        texture.needsUpdate = true;
        return texture;
      };

      // Create separate sprites for name and topic for better positioning
      const createTextSprite = (text: string, fontSize: number, yOffset: number) => {
        const texture = createTextTexture(text, fontSize);
        const spriteMaterial = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          depthWrite: false,
          depthTest: false, // Ensures text is always visible
          sizeAttenuation: true // Maintains consistent size with distance
        });

        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(finalSize * 2, finalSize * 0.5, 1);
        sprite.position.y = yOffset;
        sprite.renderOrder = 999; // Ensures text renders on top
        return sprite;
      };

      // Create text sprites with improved visibility
      const nameSprite = createTextSprite(topic.name, 64, finalSize * 0.3);
      const topicSprite = createTextSprite(topic.topic, 48, -finalSize * 0.3);
      
      // Create a text container group that will always face the camera
      const textGroup = new THREE.Group();
      textGroup.add(nameSprite);
      textGroup.add(topicSprite);
      textGroup.position.z = finalSize * 0.1; // Slight offset from bubble surface
      bubbleGroup.add(textGroup);

      // Position bubbles closer to planet
      const radius = 4;
      const angle = (index / topics.length) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius * 0.8;
      const z = Math.sin(angle) * radius * 0.6;
      bubbleGroup.position.set(x, y, z);
      
      bubbleGroup.userData = {
        id: topic.id,
        reflectCount: topic.reflect_count,
        orbitAngle: angle,
        orbitSpeed: 0.0001 + Math.random() * 0.0002,
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: 0.0005 + Math.random() * 0.0005,
        floatAmplitude: 0.15 + Math.random() * 0.15
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

    // Add touch event listeners
    containerRef.current.addEventListener('touchstart', handleTouchStart, { passive: false });
    containerRef.current.addEventListener('touchmove', handleTouchMove, { passive: false });
    containerRef.current.addEventListener('touchend', handleTouchEnd);
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
      if (isCleanedUpRef.current) return;
      
      animationFrameRef.current = requestAnimationFrame(animate);
      
      if (!rendererRef.current || !cameraRef.current || !sceneRef.current || !planetRef.current) return;

      TWEEN.update();

      // Smoothly update camera position
      zoomRef.current.current += (zoomRef.current.target - zoomRef.current.current) * 0.1;
      cameraRef.current.position.z = zoomRef.current.current;

      // Update text orientation to always face camera
      Object.values(bubblesRef.current).forEach(bubbleGroup => {
        // Make text always face camera
        bubbleGroup.children.forEach(child => {
          if (child instanceof THREE.Group && child.children.some(c => c instanceof THREE.Sprite)) {
            child.quaternion.copy(cameraRef.current!.quaternion);
          }
        });

        if (bubbleGroup.userData.orbitAngle !== undefined) {
          bubbleGroup.userData.orbitAngle += bubbleGroup.userData.orbitSpeed;
          const radius = 4;
          const x = Math.cos(bubbleGroup.userData.orbitAngle) * radius;
          const y = Math.sin(bubbleGroup.userData.orbitAngle) * radius * 0.8 + 
                   Math.sin(Date.now() * 0.001 * bubbleGroup.userData.floatSpeed + bubbleGroup.userData.floatOffset) * 
                   bubbleGroup.userData.floatAmplitude;
          const z = Math.sin(bubbleGroup.userData.orbitAngle) * radius * 0.6;
          
          bubbleGroup.position.set(x, y, z);
          bubbleGroup.lookAt(new THREE.Vector3(0, 0, 0));
        }
      });

      renderer.render(scene, camera);
    };

    animate();

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
      containerRef.current?.removeEventListener('touchstart', handleTouchStart);
      containerRef.current?.removeEventListener('touchmove', handleTouchMove);
      containerRef.current?.removeEventListener('touchend', handleTouchEnd);
    };
  }, [topics, onBubbleClick, handleReflect, handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd]);

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
