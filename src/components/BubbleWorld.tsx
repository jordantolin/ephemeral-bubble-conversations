import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useToast } from "@/hooks/use-toast";
import * as TWEEN from '@tweenjs/tween.js';
import { supabase } from "@/integrations/supabase/client";
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface BubbleData {
  id: string;
  topic: string;
  username: string;
  name: string;
  size: "sm" | "md" | "lg";
  created_at?: string;
  expires_at?: string;
}

interface BubbleWorldProps {
  topics: BubbleData[];
  onBubbleClick: (id: string) => void;
}

const isBubbleData = (data: any): data is BubbleData => {
  return (
    data &&
    typeof data.id === 'string' &&
    typeof data.topic === 'string' &&
    typeof data.username === 'string' &&
    typeof data.name === 'string' &&
    (data.size === 'sm' || data.size === 'md' || data.size === 'lg')
  );
};

const BubbleWorld = ({ topics, onBubbleClick }: BubbleWorldProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const { toast } = useToast();
  const bubblesRef = useRef<{ [key: string]: THREE.Group }>({});
  const sceneRef = useRef<THREE.Scene | null>(null);
  const animationFrameRef = useRef<number>();
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.Fog(0xFFFFFF, 15, 30);
    scene.background = new THREE.Color('#FFFFFF');

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Camera setup with proper perspective for interaction
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 15;
    cameraRef.current = camera;

    // Enhanced renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      precision: 'highp'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create central planet
    const planetGeometry = new THREE.SphereGeometry(4, 64, 64);
    const planetMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xFFFFFF,
      metalness: 0.2,
      roughness: 0.3,
      transmission: 0.6,
      thickness: 0.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
    scene.add(planet);

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.4);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xFFFAF0, 1);
    mainLight.position.set(10, 10, 10);
    scene.add(mainLight);

    const fillLight = new THREE.PointLight(0xFFF5E0, 0.8, 20);
    fillLight.position.set(-5, -2, 8);
    scene.add(fillLight);

    // Interaction state
    let isRotating = false;
    let isPinching = false;
    let previousMousePosition = { x: 0, y: 0 };
    let previousTouchDistance = 0;
    let targetRotation = { x: 0, y: 0 };
    let currentRotation = { x: 0, y: 0 };

    // Raycaster for bubble interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Touch/mouse handlers
    const onMouseDown = (event: MouseEvent) => {
      isRotating = true;
      previousMousePosition = {
        x: event.clientX,
        y: event.clientY
      };
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!isRotating) return;

      const deltaX = event.clientX - previousMousePosition.x;
      const deltaY = event.clientY - previousMousePosition.y;

      targetRotation.y += deltaX * 0.004;
      targetRotation.x += deltaY * 0.004;

      // Limit vertical rotation
      targetRotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, targetRotation.x));

      previousMousePosition = {
        x: event.clientX,
        y: event.clientY
      };
    };

    const onMouseUp = () => {
      isRotating = false;
    };

    // Touch handlers for mobile
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        isRotating = true;
        previousMousePosition = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY
        };
      } else if (event.touches.length === 2) {
        isPinching = true;
        previousTouchDistance = Math.hypot(
          event.touches[0].clientX - event.touches[1].clientX,
          event.touches[0].clientY - event.touches[1].clientY
        );
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 1 && isRotating) {
        const deltaX = event.touches[0].clientX - previousMousePosition.x;
        const deltaY = event.touches[0].clientY - previousMousePosition.y;

        targetRotation.y += deltaX * 0.004;
        targetRotation.x += deltaY * 0.004;

        // Limit vertical rotation
        targetRotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, targetRotation.x));

        previousMousePosition = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY
        };
      } else if (event.touches.length === 2 && isPinching) {
        const distance = Math.hypot(
          event.touches[0].clientX - event.touches[1].clientX,
          event.touches[0].clientY - event.touches[1].clientY
        );
        const delta = (previousTouchDistance - distance) * 0.01;
        camera.position.z = Math.max(8, Math.min(20, camera.position.z + delta));
        previousTouchDistance = distance;
      }
    };

    const onTouchEnd = () => {
      isRotating = false;
      isPinching = false;
    };

    // Zoom handler
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const zoomSpeed = 0.001;
      camera.position.z = Math.max(8, Math.min(20, camera.position.z + event.deltaY * zoomSpeed));
    };

    // Click/tap handler for bubble interaction
    const onClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        let bubble = intersects[0].object;
        while (bubble.parent && !bubble.userData.id) {
          bubble = bubble.parent;
        }
        if (bubble.userData.id) {
          setSelectedBubbleId(bubble.userData.id);
          onBubbleClick(bubble.userData.id);

          // Animate camera to focus on selected bubble
          new TWEEN.Tween(camera.position)
            .to({
              x: bubble.position.x * 0.8,
              y: bubble.position.y * 0.8,
              z: camera.position.z * 0.8
            })
            .easing(TWEEN.Easing.Quadratic.InOut)
            .duration(1000)
            .start();
        }
      }
    };

    // Add event listeners
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mouseleave', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel);
    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('touchstart', onTouchStart);
    renderer.domElement.addEventListener('touchmove', onTouchMove);
    renderer.domElement.addEventListener('touchend', onTouchEnd);

    // Bubble container
    const bubbleContainer = new THREE.Group();
    scene.add(bubbleContainer);

    // Raycaster setup
    const raycaster2 = new THREE.Raycaster();
    const mouse2 = new THREE.Vector2();

    // Initialize bubbles array
    const bubbles: THREE.Group[] = [];

    // Enhanced bubble creation function with size based on reflects
    const createBubble = (topicData: BubbleData, index: number) => {
      const bubbleGroup = new THREE.Group();
      
      const expiresAt = topicData.expires_at ? new Date(topicData.expires_at) : new Date(Date.now() + 24 * 60 * 60 * 1000);
      const timeUntilExpiration = expiresAt.getTime() - Date.now();
      const lifePercentage = Math.max(0, Math.min(1, timeUntilExpiration / (24 * 60 * 60 * 1000)));
      
      // Base size determined by reflects, scaled by remaining life
      const baseSize = topicData.size === 'lg' ? 0.8 : topicData.size === 'md' ? 0.6 : 0.4;
      const bubbleSize = baseSize * lifePercentage;

      const geometry = new THREE.SphereGeometry(bubbleSize, 32, 32);
      const material = new THREE.MeshPhongMaterial({
        color: '#ebbd34',
        transparent: true,
        opacity: lifePercentage,
        metalness: 0.2,
        roughness: 0.3,
        transmission: 0.6,
      });

      const bubble = new THREE.Mesh(geometry, material);
      bubbleGroup.add(bubble);

      // Create text canvas with improved visibility
      const canvas = document.createElement('canvas');
      canvas.width = 2048;
      canvas.height = 2048;
      const context = canvas.getContext('2d');
      
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Larger text sizes for better readability
        const nameSize = Math.floor(canvas.height * 0.12);
        const topicSize = Math.floor(canvas.height * 0.11);
        const usernameSize = Math.floor(canvas.height * 0.10);
        
        const spacing = canvas.height * 0.15;
        const startY = canvas.height/2 - spacing;
        
        // Draw text elements with pure black color for maximum contrast
        context.fillStyle = '#000000';
        context.font = `bold ${nameSize}px Inter`;
        context.fillText(topicData.name, canvas.width/2, startY);

        context.font = `${topicSize}px Inter`;
        context.fillText(topicData.topic, canvas.width/2, startY + spacing);

        context.font = `bold ${usernameSize}px Inter`;
        const usernameText = topicData.username.startsWith('@') ? topicData.username : `@${topicData.username}`;
        context.fillText(usernameText, canvas.width/2, startY + spacing * 2);
      }

      // Create and configure text texture with improved alpha handling
      const textTexture = new THREE.CanvasTexture(canvas);
      textTexture.needsUpdate = true;
      textTexture.minFilter = THREE.LinearFilter;
      textTexture.magFilter = THREE.LinearFilter;
      textTexture.anisotropy = rendererRef.current ? rendererRef.current.capabilities.getMaxAnisotropy() : 1;

      // Create larger text plane for better visibility
      const textGeometry = new THREE.PlaneGeometry(bubbleSize * 3.2, bubbleSize * 3.2);
      const textMaterial = new THREE.MeshBasicMaterial({
        map: textTexture,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false, // Ensures text always renders on top
        alphaTest: 0.01  // Reduced for smoother text edges
      });

      const textPlane = new THREE.Mesh(textGeometry, textMaterial);
      textPlane.position.z = bubbleSize * 1.2; // Slightly further from bubble
      bubbleGroup.add(textPlane);

      // Position the bubble
      const radius = 6;
      const angle = (index / topics.length) * Math.PI * 2;
      const x = radius * Math.cos(angle);
      const y = Math.sin(angle * 2) * 1.5;
      const z = radius * Math.sin(angle);
      bubbleGroup.position.set(x, y, z);

      bubbleGroup.userData = {
        id: topicData.id,
        orbitRadius: radius,
        orbitSpeed: 0.001 + Math.random() * 0.0005,
        orbitAngle: angle,
        initialY: y
      };

      bubblesRef.current[topicData.id] = bubbleGroup;

      // Handle bubble expiration
      if (timeUntilExpiration > 0) {
        setTimeout(() => {
          requestAnimationFrame(() => explodeBubble(topicData.id));
        }, timeUntilExpiration);
      }

      return bubbleGroup;
    };

    // Enhanced explosion animation
    const explodeBubble = (bubbleId: string) => {
      const bubbleGroup = bubblesRef.current[bubbleId];
      if (!bubbleGroup || !sceneRef.current) return;

      const bubble = bubbleGroup.children[0] as THREE.Mesh;
      const originalScale = bubble.scale.clone();

      // Create particle system for explosion
      const particleCount = 50;
      const particles = new THREE.Points(
        new THREE.BufferGeometry(),
        new THREE.PointsMaterial({
          color: '#ebbd34',
          size: 0.05,
          transparent: true,
          opacity: 0.8,
        })
      );

      const positions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;
      }
      particles.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      bubbleGroup.add(particles);

      // Animate explosion
      new TWEEN.Tween({ scale: 1, opacity: 1 })
        .to({ scale: 0, opacity: 0 }, 2000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(({ scale, opacity }) => {
          if (bubble.material) {
            bubble.scale.set(scale, scale, scale);
            (bubble.material as THREE.MeshPhongMaterial).opacity = opacity;
          }

          // Animate particles
          const positions = particles.geometry.attributes.position.array as Float32Array;
          for (let i = 0; i < particleCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const r = 0.5 * (1 - scale);

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);
          }
          particles.geometry.attributes.position.needsUpdate = true;
          (particles.material as THREE.PointsMaterial).opacity = opacity;
        })
        .onComplete(() => {
          if (sceneRef.current) {
            sceneRef.current.remove(bubbleGroup);
            delete bubblesRef.current[bubbleId];
          }
        })
        .start();

      // Notify user
      toast({
        title: "Bubble Expired",
        description: "This bubble has reached its 24-hour lifespan",
      });
    };

    // Initialize bubbles
    topics.forEach((topic, index) => {
      const bubbleGroup = createBubble(topic, index);
      scene.add(bubbleGroup);
    });

    // Enhanced animation loop with smooth camera movement
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      if (!rendererRef.current || !cameraRef.current || !sceneRef.current) return;

      // Smooth camera rotation
      currentRotation.x += (targetRotation.x - currentRotation.x) * 0.1;
      currentRotation.y += (targetRotation.y - currentRotation.y) * 0.1;

      scene.rotation.x = currentRotation.x;
      scene.rotation.y = currentRotation.y;

      TWEEN.update();

      // Update bubble positions with smooth movement
      Object.values(bubblesRef.current).forEach(bubbleGroup => {
        if (bubbleGroup.userData.orbitAngle !== undefined) {
          bubbleGroup.userData.orbitAngle += bubbleGroup.userData.orbitSpeed;
          const radius = bubbleGroup.userData.orbitRadius;
          const x = radius * Math.cos(bubbleGroup.userData.orbitAngle);
          const z = radius * Math.sin(bubbleGroup.userData.orbitAngle);
          const y = bubbleGroup.userData.initialY + Math.sin(Date.now() * 0.001) * 0.3;
          bubbleGroup.position.set(x, y, z);

          // Always face camera
          if (bubbleGroup.children[1]) {
            bubbleGroup.children[1].quaternion.copy(camera.quaternion);
          }
        }
      });

      renderer.render(scene, camera);
    };

    // Start animation
    animate();

    // Handle real-time updates asynchronously
    const channel = supabase
      .channel('public:bubbles')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bubbles'
        },
        (payload: RealtimePostgresChangesPayload<BubbleData>) => {
          // First, validate the payload data
          if (!payload.new) {
            console.error('No payload data received');
            return;
          }

          // Type guard check
          if (!isBubbleData(payload.new)) {
            console.error('Invalid bubble data received:', payload.new);
            return;
          }

          // At this point, TypeScript knows payload.new is BubbleData
          const newBubbleData = payload.new;

          // Create new bubble in the next animation frame
          requestAnimationFrame(() => {
            if (!sceneRef.current) return;
            
            const index = Object.keys(bubblesRef.current).length;
            const bubbleGroup = createBubble(newBubbleData, index);
            sceneRef.current.add(bubbleGroup);
            
            toast({
              title: "New Bubble Created",
              description: `${newBubbleData.name} has joined the conversation!`,
            });
          });
        }
      )
      .subscribe();

    // Enhanced cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Remove event listeners
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('mouseleave', onMouseUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('touchstart', onTouchStart);
      renderer.domElement.removeEventListener('touchmove', onTouchMove);
      renderer.domElement.removeEventListener('touchend', onTouchEnd);

      if (rendererRef.current && containerRef.current) {
        rendererRef.current.dispose();
        containerRef.current.removeChild(rendererRef.current.domElement);
      }

      TWEEN.removeAll();

      Object.values(bubblesRef.current).forEach(bubble => {
        if (bubble.userData.explosionTimeout) {
          clearTimeout(bubble.userData.explosionTimeout);
        }
      });

      supabase.removeChannel(channel);
    };
  }, [topics, onBubbleClick, selectedBubbleId]);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 touch-none overscroll-none select-none"
    />
  );
};

export default BubbleWorld;
