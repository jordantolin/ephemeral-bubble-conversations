import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useToast } from "@/hooks/use-toast";
import * as TWEEN from '@tweenjs/tween.js';
import { supabase } from "@/integrations/supabase/client";

interface BubbleData {
  id: string;
  topic: string;
  username: string;
  name: string;
  size: "sm" | "md" | "lg";
  reflect_count: number;
  created_at?: string;
}

interface BubbleWorldProps {
  topics: BubbleData[];
  onBubbleClick: (id: string) => void;
}

const BubbleWorld = ({ topics, onBubbleClick }: BubbleWorldProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const { toast } = useToast();
  const bubblesRef = useRef<{ [key: string]: THREE.Group }>({});
  const sceneRef = useRef<THREE.Scene | null>(null);
  const animationFrameRef = useRef<number>();
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  
  const isInteractingRef = useRef(false);
  const lastInteractionRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0, y: 0 });
  const momentumRef = useRef({ x: 0, y: 0 });
  const lastFrameTimeRef = useRef(Date.now());

  const zoomRef = useRef({
    current: 16,
    target: 16,
    min: 8,
    max: 24
  });

  const pinchRef = useRef({
    startDistance: 0,
    initialZoom: 16
  });

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // Add new refs for enhanced movement
  const targetRotationRef = useRef({ x: 0, y: 0, z: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

  // Function to handle reflection effect
  const handleReflect = async (bubbleId: string) => {
    const { error } = await supabase
      .from('reflects')
      .insert({ bubble_id: bubbleId, username: "@user" });

    if (error) {
      if (error.code === '23505') {
        toast({
          title: "Already reflected",
          description: "You have already reflected this bubble",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error reflecting bubble",
          description: error.message,
          variant: "destructive"
        });
      }
      return;
    }

    // Visual feedback
    const bubble = bubblesRef.current[bubbleId];
    if (bubble) {
      const bubbleMesh = bubble.children[0] as THREE.Mesh;
      const material = bubbleMesh.material as THREE.MeshStandardMaterial;
      
      // Brighten the color temporarily
      const originalColor = material.color.getHex();
      material.color.setHex(0xffd700);
      material.emissiveIntensity = 0.3;

      // Scale up animation
      const scale = 1.2;
      new TWEEN.Tween(bubble.scale)
        .to({ x: scale, y: scale, z: scale }, 300)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start()
        .onComplete(() => {
          new TWEEN.Tween(bubble.scale)
            .to({ x: 1, y: 1, z: 1 }, 200)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .start();
          
          // Reset color gradually
          new TWEEN.Tween({ intensity: 0.3 })
            .to({ intensity: 0.1 }, 500)
            .onUpdate((obj) => {
              material.emissiveIntensity = obj.intensity;
            })
            .start();
          
          material.color.setHex(originalColor);
        });
    }

    toast({
      title: "Bubble reflected!",
      description: "This bubble will appear in your profile",
    });
  };

  // Enhanced movement handlers
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

    // Limit vertical rotation
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

  const handleWheel = (event: WheelEvent) => {
    event.preventDefault();
    const zoomSpeed = 0.001;
    zoomRef.current.target = Math.max(
      zoomRef.current.min,
      Math.min(zoomRef.current.max,
        zoomRef.current.target + event.deltaY * zoomSpeed * zoomRef.current.target
      )
    );
  };

  const createBubble = (renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, topicData: BubbleData, index: number) => {
    const bubbleGroup = new THREE.Group();
    
    const baseSize = topicData.size === 'lg' ? 0.8 : 
                    topicData.size === 'md' ? 0.6 : 0.4;
    const reflectScale = 1 + (topicData.reflect_count * 0.1);
    const finalSize = baseSize * reflectScale;
    
    const geometry = new THREE.SphereGeometry(finalSize, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0xebc942,
      emissive: 0xebc942,
      emissiveIntensity: 0.1,
      metalness: 0.2,
      roughness: 0.3,
      transparent: true,
      opacity: 0.9
    });

    const bubble = new THREE.Mesh(geometry, material);
    bubbleGroup.add(bubble);

    const glowGeometry = new THREE.SphereGeometry(finalSize * 1.1, 32, 32);
    const glowMaterial = new THREE.MeshStandardMaterial({
      color: 0xebc942,
      transparent: true,
      opacity: 0.1
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    bubble.add(glow);

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const context = canvas.getContext('2d');
    
    if (context) {
      context.fillStyle = '#000000';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.globalCompositeOperation = 'destination-out';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.globalCompositeOperation = 'source-over';
      
      const nameSize = Math.floor(canvas.height * 0.12 * reflectScale);
      const topicSize = Math.floor(canvas.height * 0.11 * reflectScale);
      const usernameSize = Math.floor(canvas.height * 0.10 * reflectScale);
      
      const spacing = canvas.height * 0.15;
      const startY = canvas.height/2 - spacing;

      const drawText = (text: string, y: number, fontSize: number) => {
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        context.strokeStyle = '#000000';
        context.lineWidth = fontSize * 0.2;
        context.lineJoin = 'round';
        context.font = `bold ${fontSize}px Inter`;
        context.strokeText(text, canvas.width/2, y);
        
        context.fillStyle = '#FFFFFF';
        context.fillText(text, canvas.width/2, y);
      };

      drawText(topicData.name, startY, nameSize);
      drawText(topicData.topic, startY + spacing, topicSize);
      drawText(topicData.username, startY + spacing * 2, usernameSize);
    }

    const textTexture = new THREE.CanvasTexture(canvas);
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

    const radius = 6;
    const angle = (index / topics.length) * Math.PI * 2;
    const phi = Math.acos(-1 + (2 * index) / topics.length);
    const theta = Math.sqrt(topics.length * Math.PI) * phi;
    
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle) * Math.cos(theta * 0.5);
    const z = radius * Math.sin(angle) * Math.sin(theta * 0.5);
    
    bubbleGroup.position.set(x, y, z);
    bubbleGroup.userData = {
      id: topicData.id,
      orbitRadius: radius,
      orbitSpeed: 0.0005,
      orbitAngle: angle,
      orbitHeight: y
    };

    bubbleGroup.lookAt(camera.position);

    bubblesRef.current[topicData.id] = bubbleGroup;
    return bubbleGroup;
  };

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

    const worldGeometry = new THREE.SphereGeometry(4, 64, 64);
    const worldMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      metalness: 0.2,
      roughness: 0.3,
      transparent: true,
      opacity: 0.8
    });
    const worldSphere = new THREE.Mesh(worldGeometry, worldMaterial);
    scene.add(worldSphere);
    
    const glowGeometry = new THREE.SphereGeometry(4.2, 64, 64);
    const glowMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.1
    });
    const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
    worldSphere.add(glowSphere);

    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1.0);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xFFFFFF, 1.5);
    mainLight.position.set(10, 10, 10);
    scene.add(mainLight);

    const pointLight1 = new THREE.PointLight(0xFFFFFF, 0.5);
    pointLight1.position.set(-10, 5, -5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xFFFFFF, 0.5);
    pointLight2.position.set(10, -5, 5);
    scene.add(pointLight2);

    topics.forEach((topic, index) => {
      const bubble = createBubble(renderer, camera, topic, index);
      scene.add(bubble);
    });

    const handleClick = (event: MouseEvent) => {
      if (isInteractingRef.current) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      if (cameraRef.current && sceneRef.current) {
        raycaster.setFromCamera(mouse, cameraRef.current);
        const intersects = raycaster.intersectObjects(sceneRef.current.children, true);

        for (const intersect of intersects) {
          let current = intersect.object;
          while (current.parent) {
            if (current.userData?.id) {
              onBubbleClick(current.userData.id);
              return;
            }
            current = current.parent;
          }
        }
      }
    };

    containerRef.current.addEventListener('click', handleClick);

    const handleTouchStart = (event: TouchEvent) => {
      event.preventDefault();
      
      if (event.touches.length === 2) {
        const dx = event.touches[0].clientX - event.touches[1].clientX;
        const dy = event.touches[0].clientY - event.touches[1].clientY;
        pinchRef.current.startDistance = Math.sqrt(dx * dx + dy * dy);
        pinchRef.current.initialZoom = zoomRef.current.target;
      } else if (event.touches.length === 1) {
        startInteraction(event.touches[0].clientX, event.touches[0].clientY);
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        const dx = event.touches[0].clientX - event.touches[1].clientX;
        const dy = event.touches[0].clientY - event.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const scale = distance / pinchRef.current.startDistance;
        const newZoom = pinchRef.current.initialZoom / scale;
        
        zoomRef.current.target = Math.max(
          zoomRef.current.min,
          Math.min(zoomRef.current.max, newZoom)
        );
      } else if (event.touches.length === 1) {
        moveInteraction(event.touches[0].clientX, event.touches[0].clientY);
      }
    };

    const startInteraction = (x: number, y: number) => {
      isInteractingRef.current = true;
      lastInteractionRef.current = { x, y };
      momentumRef.current = { x: 0, y: 0 };
    };

    const moveInteraction = (x: number, y: number) => {
      if (!isInteractingRef.current) return;

      const deltaX = x - lastInteractionRef.current.x;
      const deltaY = y - lastInteractionRef.current.y;

      momentumRef.current = {
        x: deltaX * 0.003,
        y: deltaY * 0.003
      };

      rotationRef.current.y += momentumRef.current.x;
      rotationRef.current.x += momentumRef.current.y;

      rotationRef.current.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotationRef.current.x));

      lastInteractionRef.current = { x, y };
    };

    const endInteraction = () => {
      isInteractingRef.current = false;
    };

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      startInteraction(e.clientX, e.clientY);
    };

    const onMouseMove = (e: MouseEvent) => {
      moveInteraction(e.clientX, e.clientY);
    };

    const onMouseUp = () => {
      endInteraction();
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      startInteraction(touch.clientX, touch.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      moveInteraction(touch.clientX, touch.clientY);
    };

    const onTouchEnd = () => {
      endInteraction();
    };

    containerRef.current.addEventListener('wheel', handleWheel, { passive: false });
    containerRef.current.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    containerRef.current.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    containerRef.current.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('resize', () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    });

    // Add event listeners for enhanced movement
    containerRef.current.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    containerRef.current.addEventListener('wheel', handleWheel, { passive: false });

    // Double click to reflect
    containerRef.current.addEventListener('dblclick', (event) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      if (cameraRef.current && sceneRef.current) {
        raycaster.setFromCamera(mouse, cameraRef.current);
        const intersects = raycaster.intersectObjects(sceneRef.current.children, true);

        for (const intersect of intersects) {
          let current = intersect.object;
          while (current.parent) {
            if (current.userData?.id) {
              handleReflect(current.userData.id);
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

      // Update TWEEN
      TWEEN.update();

      // Smooth rotation
      sceneRef.current.rotation.x += (targetRotationRef.current.x - sceneRef.current.rotation.x) * 0.1;
      sceneRef.current.rotation.y += (targetRotationRef.current.y - sceneRef.current.rotation.y) * 0.1;

      const currentTime = Date.now();
      const deltaTime = (currentTime - lastFrameTimeRef.current) / 16;
      lastFrameTimeRef.current = currentTime;

      zoomRef.current.current += (zoomRef.current.target - zoomRef.current.current) * 0.1;
      if (cameraRef.current) {
        cameraRef.current.position.z = zoomRef.current.current;
      }

      worldSphere.rotation.y += 0.001;
      glowSphere.rotation.y -= 0.0005;

      Object.values(bubblesRef.current).forEach(bubbleGroup => {
        if (bubbleGroup.userData.orbitAngle !== undefined) {
          bubbleGroup.userData.orbitAngle += bubbleGroup.userData.orbitSpeed;
          const radius = bubbleGroup.userData.orbitRadius;
          const angle = bubbleGroup.userData.orbitAngle;
          
          const x = radius * Math.cos(angle);
          const z = radius * Math.sin(angle);
          const y = bubbleGroup.userData.orbitHeight + Math.sin(currentTime * 0.001 + angle) * 0.2;
          
          bubbleGroup.position.set(x, y, z);
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

      if (containerRef.current) {
        containerRef.current.removeEventListener('wheel', handleWheel);
        containerRef.current.removeEventListener('touchstart', handleTouchStart);
        containerRef.current.removeEventListener('mousedown', onMouseDown);
        containerRef.current.removeEventListener('click', handleClick);
      }
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchend', onTouchEnd);
      containerRef.current?.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      containerRef.current?.removeEventListener('wheel', handleWheel);
    };
  }, [topics, onBubbleClick]);

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
