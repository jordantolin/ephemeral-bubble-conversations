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

    // Camera setup with persistent reference
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 15;
    cameraRef.current = camera;

    // Renderer setup with persistent reference
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

    // Bubble container
    const bubbleContainer = new THREE.Group();
    scene.add(bubbleContainer);

    // Raycaster setup
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Initialize bubbles array
    const bubbles: THREE.Group[] = [];

    // Optimized bubble creation function
    const createBubble = (topicData: BubbleData, index: number) => {
      const bubbleGroup = new THREE.Group();
      
      const createdAt = topicData.created_at ? new Date(topicData.created_at) : new Date();
      const ageInHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
      const remainingLife = Math.max(0, 24 - ageInHours);
      
      const baseSize = topicData.size === 'lg' ? 0.8 : topicData.size === 'md' ? 0.6 : 0.4;
      const bubbleSize = baseSize * (remainingLife / 24);

      const geometry = new THREE.SphereGeometry(bubbleSize, 32, 32);
      const material = new THREE.MeshBasicMaterial({
        color: '#ebbd34',
        transparent: true,
        opacity: remainingLife / 24,
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

      // Handle bubble expiration asynchronously
      if (remainingLife > 0) {
        const timeUntilExplosion = remainingLife * 60 * 60 * 1000;
        setTimeout(() => {
          requestAnimationFrame(() => explodeBubble(topicData.id));
        }, timeUntilExplosion);
      }

      return bubbleGroup;
    };

    // Explosion animation function
    const explodeBubble = (bubbleId: string) => {
      const bubbleGroup = bubblesRef.current[bubbleId];
      if (!bubbleGroup || !sceneRef.current) return;

      const bubble = bubbleGroup.children[0] as THREE.Mesh;
      const originalScale = bubble.scale.clone();
      const originalOpacity = (bubble.material as THREE.MeshBasicMaterial).opacity;

      // Create particle system for explosion effect
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
      new TWEEN.Tween({ scale: 1, opacity: originalOpacity })
        .to({ scale: 0, opacity: 0 }, 2000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(({ scale, opacity }) => {
          if (bubble.material) {
            bubble.scale.set(scale, scale, scale);
            (bubble.material as THREE.MeshBasicMaterial).opacity = opacity;
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
    };

    // Initialize bubbles
    topics.forEach((topic, index) => {
      const bubbleGroup = createBubble(topic, index);
      scene.add(bubbleGroup);
    });

    // Optimized animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      if (!rendererRef.current || !cameraRef.current || !sceneRef.current) return;

      TWEEN.update();

      // Update bubble positions
      Object.values(bubblesRef.current).forEach(bubbleGroup => {
        if (bubbleGroup.userData.orbitAngle !== undefined) {
          bubbleGroup.userData.orbitAngle += bubbleGroup.userData.orbitSpeed;
          const radius = bubbleGroup.userData.orbitRadius;
          const x = radius * Math.cos(bubbleGroup.userData.orbitAngle);
          const z = radius * Math.sin(bubbleGroup.userData.orbitAngle);
          const y = bubbleGroup.userData.initialY + Math.sin(Date.now() * 0.001) * 0.3;
          bubbleGroup.position.set(x, y, z);

          // Update text orientation
          if (bubbleGroup.userData.textPlane) {
            bubbleGroup.userData.textPlane.quaternion.copy(cameraRef.current.quaternion);
          }
        }
      });

      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };

    // Start animation loop
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
          if (!payload.new || !isBubbleData(payload.new)) return;

          // Create new bubble in the next animation frame
          requestAnimationFrame(() => {
            if (!sceneRef.current) return;
            
            const index = Object.keys(bubblesRef.current).length;
            const bubbleGroup = createBubble(payload.new as BubbleData, index);
            sceneRef.current.add(bubbleGroup);
            
            toast({
              title: "New Bubble Created",
              description: `${payload.new.name} has joined the conversation!`,
            });
          });
        }
      )
      .subscribe();

    // Interaction state
    let isRotating = false;
    let isPinching = false;
    let previousMousePosition = { x: 0, y: 0 };
    let previousTouchDistance = 0;
    let targetRotation = { x: 0, y: 0 };
    let currentRotation = { x: 0, y: 0 };

    // Mouse/Touch handlers
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

      targetRotation.x += deltaY * 0.004;
      targetRotation.y += deltaX * 0.004;

      previousMousePosition = {
        x: event.clientX,
        y: event.clientY
      };
    };

    const onMouseUp = () => {
      isRotating = false;
    };

    // Add zoom handler
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const zoomSpeed = 0.001;
      const newZ = camera.position.z + event.deltaY * zoomSpeed;
      camera.position.z = Math.max(8, Math.min(20, newZ));
    };

    const onClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(bubbleContainer.children, true);

      if (intersects.length > 0) {
        let bubble = intersects[0].object;
        while (bubble.parent && !bubble.userData.id) {
          bubble = bubble.parent;
        }
        if (bubble.userData.id) {
          setSelectedBubbleId(bubble.userData.id);
          onBubbleClick(bubble.userData.id);
        }
      }
    };

    // Enhanced cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (rendererRef.current && containerRef.current) {
        rendererRef.current.dispose();
        containerRef.current.removeChild(rendererRef.current.domElement);
      }

      // Clear all tweens
      TWEEN.removeAll();

      // Clear all timeouts
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
