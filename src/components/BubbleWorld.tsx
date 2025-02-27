
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { BubbleWorldProps } from '@/types/bubble';
import { 
  createBubbleGeometry, 
  createBubbleMaterial, 
  createTextCanvas,
  createCentralWorldGeometry,
  createCentralWorldMaterial,
  calculateOrbitPosition
} from '@/utils/bubbleUtils';

const BubbleWorld = ({ topics, onBubbleClick }: BubbleWorldProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bubblesRef = useRef<{ [key: string]: THREE.Group }>({});
  const sceneRef = useRef<THREE.Scene | null>(null);
  const animationFrameRef = useRef<number>();
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const centralWorldRef = useRef<THREE.Mesh | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const interactionRef = useRef({
    isInteracting: false,
    lastX: 0,
    lastY: 0,
    rotationSpeed: { x: 0, y: 0 },
    momentum: { x: 0, y: 0 },
    zoom: {
      current: 12,
      target: 12,
      min: 5,
      max: 20
    },
    pinchDistance: 0
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
    interactionRef.current.zoom.current = camera.position.z;
    interactionRef.current.zoom.target = camera.position.z;
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

    // Create Earth and bubbles
    const worldGeometry = createCentralWorldGeometry();
    const worldMaterial = createCentralWorldMaterial();
    const centralWorld = new THREE.Mesh(worldGeometry, worldMaterial);
    centralWorldRef.current = centralWorld;
    scene.add(centralWorld);

    // Create bubbles with orbital movement
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

      // Add text labels
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

      // Set initial position
      const position = calculateOrbitPosition(index, topics.length, 0);
      bubbleGroup.position.set(position.x, position.y, position.z);
      
      bubbleGroup.userData = {
        id: topic.id,
        orbitIndex: index,
      };

      bubblesRef.current[topic.id] = bubbleGroup;
      scene.add(bubbleGroup);
    });

    // Handle bubble clicks
    const handleBubbleClick = (event: MouseEvent | TouchEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((event instanceof MouseEvent ? event.clientX : event.touches[0].clientX) - rect.left) / rect.width * 2 - 1;
      const y = -((event instanceof MouseEvent ? event.clientY : event.touches[0].clientY) - rect.top) / rect.height * 2 + 1;

      mouseRef.current.set(x, y);
      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      const intersects = raycasterRef.current.intersectObjects(
        Object.values(bubblesRef.current).map(group => group.children[0]),
        true
      );

      if (intersects.length > 0) {
        const bubble = intersects[0].object;
        const bubbleGroup = bubble.parent;
        if (bubbleGroup && bubbleGroup.userData.id) {
          onBubbleClick(bubbleGroup.userData.id);
        }
      }
    };

    // Mouse wheel zoom
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoom = interactionRef.current.zoom;
      const delta = e.deltaY * 0.01;
      zoom.target = Math.max(
        zoom.min,
        Math.min(zoom.max, zoom.target + delta)
      );
    };

    // Unified interaction handling for both mouse and touch
    const startInteraction = (x: number, y: number) => {
      interactionRef.current.isInteracting = true;
      interactionRef.current.lastX = x;
      interactionRef.current.lastY = y;
    };

    const moveInteraction = (x: number, y: number) => {
      if (!interactionRef.current.isInteracting || !centralWorld) return;

      const deltaX = (x - interactionRef.current.lastX) * 0.005;
      const deltaY = (y - interactionRef.current.lastY) * 0.005;

      centralWorld.rotation.y += deltaX;
      centralWorld.rotation.x += deltaY;

      interactionRef.current.momentum = { x: deltaX, y: deltaY };
      interactionRef.current.lastX = x;
      interactionRef.current.lastY = y;
    };

    const endInteraction = () => {
      if (!interactionRef.current.isInteracting) return;
      
      interactionRef.current.isInteracting = false;
      
      const decay = 0.95;
      const applyMomentum = () => {
        if (!centralWorld) return;
        
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

    container.addEventListener('mouseup', (e) => {
      if (!interactionRef.current.isInteracting) {
        handleBubbleClick(e);
      }
      endInteraction();
    });

    container.addEventListener('mouseleave', endInteraction);
    container.addEventListener('wheel', handleWheel, { passive: false });

    // Touch events
    container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        startInteraction(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    container.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        moveInteraction(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    container.addEventListener('touchend', (e) => {
      if (!interactionRef.current.isInteracting && e.changedTouches.length === 1) {
        handleBubbleClick(e.changedTouches[0]);
      }
      endInteraction();
    });

    // Animation loop
    let time = 0;
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      time += 0.002;
      
      const zoom = interactionRef.current.zoom;
      zoom.current += (zoom.target - zoom.current) * 0.1;
      if (camera) {
        camera.position.z = zoom.current;
      }

      Object.values(bubblesRef.current).forEach(bubble => {
        const index = bubble.userData.orbitIndex;
        const pos = calculateOrbitPosition(index, Object.keys(bubblesRef.current).length, time);
        
        const rotationOffset = new THREE.Euler(
          centralWorld.rotation.x,
          centralWorld.rotation.y,
          centralWorld.rotation.z
        );
        const rotatedPosition = new THREE.Vector3(pos.x, pos.y, pos.z)
          .applyEuler(rotationOffset);
        
        bubble.position.copy(rotatedPosition);
        bubble.quaternion.copy(camera.quaternion);
      });

      if (!interactionRef.current.isInteracting) {
        centralWorld.rotation.y += 0.0005;
      }

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
      container.removeEventListener('wheel', handleWheel);
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
