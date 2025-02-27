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

const BubbleWorld = ({ topics, onBubbleClick }: BubbleWorldProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bubblesRef = useRef<{ [key: string]: THREE.Group }>({});
  const sceneRef = useRef<THREE.Scene | null>(null);
  const animationFrameRef = useRef<number>();
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const centralWorldRef = useRef<THREE.Mesh | null>(null);
  const interactionRef = useRef({
    isInteracting: false,
    lastX: 0,
    lastY: 0,
    rotationSpeed: { x: 0, y: 0 },
    momentum: { x: 0, y: 0 }
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color('#FEF7E4');

    const width = container.clientWidth;
    const height = container.clientHeight;
    const isMobile = width < 768;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
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

    // Enhanced lighting
    const ambientLight = new THREE.AmbientLight('#FFFFFF', 1.2);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight('#FFFFFF', 2);
    mainLight.position.set(5, 5, 5);
    scene.add(mainLight);

    const backLight = new THREE.DirectionalLight('#FFFFFF', 1);
    backLight.position.set(-5, -5, -5);
    scene.add(backLight);

    // Create Earth
    const worldGeometry = createCentralWorldGeometry();
    const worldMaterial = createCentralWorldMaterial();
    const centralWorld = new THREE.Mesh(worldGeometry, worldMaterial);
    centralWorldRef.current = centralWorld;
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

      // Add text labels with enhanced visibility
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

      bubbleGroup.add(createSprite(topic.name, 1.2, isMobile ? 36 : 48));
      bubbleGroup.add(createSprite(topic.topic, 0.2, isMobile ? 28 : 32));
      bubbleGroup.add(createSprite(`⭐ ${topic.reflect_count}`, -0.8, isMobile ? 24 : 28));

      // Position bubbles in a spiral pattern
      const angle = (index / topics.length) * Math.PI * 2;
      const spiralRadius = 4 + (index * 0.2);
      const x = spiralRadius * Math.cos(angle);
      const y = spiralRadius * Math.sin(angle);
      const z = (index * 0.2) - 2;

      bubbleGroup.position.set(x, y, z);
      bubbleGroup.userData = {
        id: topic.id,
        initialPosition: { x, y, z }
      };

      bubblesRef.current[topic.id] = bubbleGroup;
      scene.add(bubbleGroup);
    });

    // Unified interaction handling for both mouse and touch
    const startInteraction = (x: number, y: number) => {
      interactionRef.current = {
        isInteracting: true,
        lastX: x,
        lastY: y,
        rotationSpeed: { x: 0, y: 0 },
        momentum: { x: 0, y: 0 }
      };
    };

    const moveInteraction = (x: number, y: number) => {
      if (!interactionRef.current.isInteracting || !centralWorld) return;

      const deltaX = x - interactionRef.current.lastX;
      const deltaY = y - interactionRef.current.lastY;

      // Update rotation based on movement
      centralWorld.rotation.y += deltaX * 0.005;
      centralWorld.rotation.x += deltaY * 0.005;

      // Store momentum
      interactionRef.current.momentum = {
        x: deltaX * 0.005,
        y: deltaY * 0.005
      };

      interactionRef.current.lastX = x;
      interactionRef.current.lastY = y;
    };

    const endInteraction = () => {
      interactionRef.current.isInteracting = false;
      
      // Apply momentum with decay
      const applyMomentum = () => {
        if (!centralWorld) return;

        const decay = 0.95;
        const momentum = interactionRef.current.momentum;

        if (Math.abs(momentum.x) > 0.0001 || Math.abs(momentum.y) > 0.0001) {
          centralWorld.rotation.y += momentum.x;
          centralWorld.rotation.x += momentum.y;
          momentum.x *= decay;
          momentum.y *= decay;
          requestAnimationFrame(applyMomentum);
        }
      };

      applyMomentum();
    };

    // Mouse events
    container.addEventListener('mousedown', (e) => {
      startInteraction(e.clientX, e.clientY);
    });

    container.addEventListener('mousemove', (e) => {
      moveInteraction(e.clientX, e.clientY);
    });

    container.addEventListener('mouseup', () => {
      endInteraction();
    });

    container.addEventListener('mouseleave', () => {
      endInteraction();
    });

    // Touch events
    container.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      startInteraction(touch.clientX, touch.clientY);
    }, { passive: false });

    container.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      moveInteraction(touch.clientX, touch.clientY);
    }, { passive: false });

    container.addEventListener('touchend', () => {
      endInteraction();
    });

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      // Gentle auto-rotation when not interacting
      if (!interactionRef.current.isInteracting) {
        centralWorld.rotation.y += 0.0005;
      }

      // Keep bubbles facing camera
      Object.values(bubblesRef.current).forEach(bubble => {
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
