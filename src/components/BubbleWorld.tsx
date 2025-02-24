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
  const { handleMouseDown, handleMouseMove, handleMouseUp, handleWheel, updateCamera } = useCameraControls();

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

    // Add mouse and wheel event listeners
    containerRef.current.addEventListener('mousedown', handleMouseDown);
    containerRef.current.addEventListener('mousemove', handleMouseMove);
    containerRef.current.addEventListener('mouseup', handleMouseUp);
    containerRef.current.addEventListener('mouseleave', handleMouseUp);
    containerRef.current.addEventListener('wheel', handleWheel, { passive: false });

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

      // Create text with larger size and better contrast
      const createTextTexture = (text: string, fontSize: number) => {
        const canvas = document.createElement('canvas');
        const size = 1024; // Increased canvas size for better quality
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d')!;
        
        context.fillStyle = 'rgba(0,0,0,0)';
        context.fillRect(0, 0, size, size);
        
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.font = `bold ${fontSize * 1.5}px Inter`; // Increased font size
        
        // Thicker white outline for better contrast
        context.strokeStyle = '#FFFFFF';
        context.lineWidth = fontSize * 0.2;
        context.lineJoin = 'round';
        context.strokeText(text, size / 2, size / 2);
        
        // Dark text for better readability
        context.fillStyle = '#000000';
        context.fillText(text, size / 2, size / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = rendererRef.current!.capabilities.getMaxAnisotropy();
        texture.needsUpdate = true;
        return texture;
      };

      const createTextSprite = (text: string, fontSize: number, yOffset: number) => {
        const texture = createTextTexture(text, fontSize);
        const spriteMaterial = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          depthWrite: false,
          depthTest: false
        });

        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(finalSize * 3, finalSize * 0.75, 1); // Increased scale for larger text
        sprite.position.y = yOffset;
        sprite.renderOrder = 999;
        return sprite;
      };

      // Create larger text sprites
      const nameSprite = createTextSprite(topic.name, 96, finalSize * 0.4); // Increased font size
      const topicSprite = createTextSprite(topic.topic, 72, -finalSize * 0.4); // Increased font size
      
      const textGroup = new THREE.Group();
      textGroup.add(nameSprite);
      textGroup.add(topicSprite);
      textGroup.position.z = finalSize * 0.1;
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

    const animate = () => {
      if (isCleanedUpRef.current) return;
      
      animationFrameRef.current = requestAnimationFrame(animate);
      
      if (!rendererRef.current || !cameraRef.current || !sceneRef.current) return;

      // Update camera position and rotation
      updateCamera(cameraRef.current);

      TWEEN.update();

      // Update text orientation to always face camera
      Object.values(bubblesRef.current).forEach(bubbleGroup => {
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

      containerRef.current?.removeEventListener('mousedown', handleMouseDown);
      containerRef.current?.removeEventListener('mousemove', handleMouseMove);
      containerRef.current?.removeEventListener('mouseup', handleMouseUp);
      containerRef.current?.removeEventListener('mouseleave', handleMouseUp);
      containerRef.current?.removeEventListener('wheel', handleWheel);
    };
  }, [topics, onBubbleClick, handleReflect, handleMouseDown, handleMouseMove, handleMouseUp, handleWheel, updateCamera]);

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
