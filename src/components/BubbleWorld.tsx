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

    // Camera setup
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 15;
    cameraRef.current = camera;

    // Renderer setup
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

    // Enhanced lighting setup
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.6); // Increased intensity
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xFFFAF0, 1.2); // Increased intensity
    mainLight.position.set(10, 10, 10);
    scene.add(mainLight);

    const fillLight = new THREE.PointLight(0xFFF5E0, 1.0, 20); // Increased intensity
    fillLight.position.set(-5, -2, 8);
    scene.add(fillLight);

    // Bubble container
    const bubbleContainer = new THREE.Group();
    scene.add(bubbleContainer);

    // Enhanced bubble creation function
    const createBubble = (topicData: BubbleData, index: number) => {
      const bubbleGroup = new THREE.Group();
      
      const baseSize = topicData.size === 'lg' ? 0.8 : topicData.size === 'md' ? 0.6 : 0.4;
      
      // Fixed bubble material settings for better visibility
      const geometry = new THREE.SphereGeometry(baseSize, 32, 32);
      const material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#ebbd34'),
        transparent: true,
        opacity: 0.85, // Reduced transparency
        metalness: 0.3,
        roughness: 0.4,
        transmission: 0.1, // Reduced transmission
        thickness: 1.0, // Increased thickness
        clearcoat: 0.5,
        clearcoatRoughness: 0.3,
        side: THREE.FrontSide // Ensure proper rendering
      });

      const bubble = new THREE.Mesh(geometry, material);
      bubble.castShadow = true;
      bubble.receiveShadow = true;
      bubbleGroup.add(bubble);

      // Text creation
      const canvas = document.createElement('canvas');
      canvas.width = 1024; // Reduced for performance
      canvas.height = 1024;
      const context = canvas.getContext('2d');
      
      if (context) {
        context.fillStyle = '#000000';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.globalCompositeOperation = 'destination-out';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.globalCompositeOperation = 'source-over';
        
        const nameSize = Math.floor(canvas.height * 0.12);
        const topicSize = Math.floor(canvas.height * 0.11);
        const usernameSize = Math.floor(canvas.height * 0.10);
        
        const spacing = canvas.height * 0.15;
        const startY = canvas.height/2 - spacing;
        
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Name with shadow
        context.font = `bold ${nameSize}px Inter`;
        context.fillStyle = 'rgba(0,0,0,0.2)';
        context.fillText(topicData.name, canvas.width/2 + 2, startY + 2);
        context.fillStyle = '#000000';
        context.fillText(topicData.name, canvas.width/2, startY);

        // Topic with shadow
        context.font = `${topicSize}px Inter`;
        context.fillStyle = 'rgba(0,0,0,0.2)';
        context.fillText(topicData.topic, canvas.width/2 + 2, startY + spacing + 2);
        context.fillStyle = '#000000';
        context.fillText(topicData.topic, canvas.width/2, startY + spacing);

        // Username with shadow
        context.font = `bold ${usernameSize}px Inter`;
        const usernameText = topicData.username.startsWith('@') ? topicData.username : `@${topicData.username}`;
        context.fillStyle = 'rgba(0,0,0,0.2)';
        context.fillText(usernameText, canvas.width/2 + 2, startY + spacing * 2 + 2);
        context.fillStyle = '#000000';
        context.fillText(usernameText, canvas.width/2, startY + spacing * 2);
      }

      // Create text mesh
      const textTexture = new THREE.CanvasTexture(canvas);
      textTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      
      const textMaterial = new THREE.MeshBasicMaterial({
        map: textTexture,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const textGeometry = new THREE.PlaneGeometry(baseSize * 3, baseSize * 3);
      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      textMesh.position.z = baseSize * 1.1;
      textMesh.renderOrder = 1; // Ensure text renders on top
      bubbleGroup.add(textMesh);

      // Position bubble
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

      // Store reference and add to scene
      bubblesRef.current[topicData.id] = bubbleGroup;
      return bubbleGroup;
    };

    // Initialize all bubbles
    topics.forEach((topic, index) => {
      const bubbleGroup = createBubble(topic, index);
      bubbleContainer.add(bubbleGroup);
    });

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

    // Enhanced animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      if (!rendererRef.current || !cameraRef.current || !sceneRef.current) return;

      // Smooth camera rotation
      currentRotation.x += (targetRotation.x - currentRotation.x) * 0.1;
      currentRotation.y += (targetRotation.y - currentRotation.y) * 0.1;

      scene.rotation.x = currentRotation.x;
      scene.rotation.y = currentRotation.y;

      // Update bubbles and text
      Object.values(bubblesRef.current).forEach(bubbleGroup => {
        if (bubbleGroup.userData.orbitAngle !== undefined) {
          bubbleGroup.userData.orbitAngle += bubbleGroup.userData.orbitSpeed;
          const radius = bubbleGroup.userData.orbitRadius;
          const x = radius * Math.cos(bubbleGroup.userData.orbitAngle);
          const z = radius * Math.sin(bubbleGroup.userData.orbitAngle);
          const y = bubbleGroup.userData.initialY + Math.sin(Date.now() * 0.001) * 0.3;
          bubbleGroup.position.set(x, y, z);

          // Billboard text
          if (bubbleGroup.children[1]) {
            const textMesh = bubbleGroup.children[1];
            textMesh.quaternion.copy(camera.quaternion);
          }
        }
      });

      TWEEN.update();
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
            bubbleContainer.add(bubbleGroup);
            
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
  }, [topics, onBubbleClick]);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 touch-none overscroll-none select-none"
    />
  );
};

export default BubbleWorld;
