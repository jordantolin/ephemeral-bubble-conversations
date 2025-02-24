
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

const BubbleWorld = ({ topics, onBubbleClick }: BubbleWorldProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const { toast } = useToast();
  const bubblesRef = useRef<{ [key: string]: THREE.Group }>({});
  const sceneRef = useRef<THREE.Scene | null>(null);
  const animationFrameRef = useRef<number>();
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  
  // Add mouse interaction state
  const isMouseDownRef = useRef(false);
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const targetRotationRef = useRef({ x: 0, y: 0 });
  const currentRotationRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
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
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1.0);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xFFFFFF, 1.5);
    mainLight.position.set(10, 10, 10);
    scene.add(mainLight);

    // Bubble container
    const bubbleContainer = new THREE.Group();
    scene.add(bubbleContainer);

    const createBubble = (topicData: BubbleData, index: number) => {
      const bubbleGroup = new THREE.Group();
      
      const baseSize = topicData.size === 'lg' ? 0.8 : topicData.size === 'md' ? 0.6 : 0.4;
      
      // Create bubble with exact button color
      const geometry = new THREE.SphereGeometry(baseSize, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#ebbd34'),
        emissive: new THREE.Color('#ebbd34'),
        emissiveIntensity: 0.2,
        metalness: 0,
        roughness: 0.3,
      });

      const bubble = new THREE.Mesh(geometry, material);
      bubbleGroup.add(bubble);

      // Create text
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
        
        const nameSize = Math.floor(canvas.height * 0.12);
        const topicSize = Math.floor(canvas.height * 0.11);
        const usernameSize = Math.floor(canvas.height * 0.10);
        
        const spacing = canvas.height * 0.15;
        const startY = canvas.height/2 - spacing;

        const drawText = (text: string, y: number, fontSize: number) => {
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          
          context.strokeStyle = '#000000';
          context.lineWidth = fontSize * 0.2;
          context.lineJoin = 'round';
          context.font = `${fontSize}px Inter`;
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

      const textGeometry = new THREE.PlaneGeometry(baseSize * 3, baseSize * 3);
      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      textMesh.position.z = baseSize * 1.1;
      bubbleGroup.add(textMesh);

      // Position bubble
      const radius = 8;
      const angle = (index / topics.length) * Math.PI * 2;
      const x = radius * Math.cos(angle);
      const y = Math.sin(angle * 2) * 1.5;
      const z = radius * Math.sin(angle);
      
      bubbleGroup.position.set(x, y, z);

      bubbleGroup.userData = {
        id: topicData.id,
        orbitRadius: radius,
        orbitSpeed: 0.001,
        orbitAngle: angle,
        initialY: y
      };

      bubblesRef.current[topicData.id] = bubbleGroup;
      return bubbleGroup;
    };

    // Create initial bubbles
    topics.forEach((topic, index) => {
      const bubbleGroup = createBubble(topic, index);
      bubbleContainer.add(bubbleGroup);
    });

    // Mouse event handlers
    const onMouseDown = (event: MouseEvent) => {
      event.preventDefault();
      isMouseDownRef.current = true;
      mousePositionRef.current = {
        x: event.clientX,
        y: event.clientY
      };
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!isMouseDownRef.current) return;

      const deltaX = event.clientX - mousePositionRef.current.x;
      const deltaY = event.clientY - mousePositionRef.current.y;

      mousePositionRef.current = {
        x: event.clientX,
        y: event.clientY
      };

      targetRotationRef.current.y += deltaX * 0.01;
      targetRotationRef.current.x += deltaY * 0.01;

      // Limit vertical rotation
      targetRotationRef.current.x = Math.max(
        -Math.PI / 4,
        Math.min(Math.PI / 4, targetRotationRef.current.x)
      );
    };

    const onMouseUp = () => {
      isMouseDownRef.current = false;
    };

    // Add event listeners
    containerRef.current.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      if (!rendererRef.current || !cameraRef.current || !sceneRef.current) return;

      // Update scene rotation
      currentRotationRef.current.x += (targetRotationRef.current.x - currentRotationRef.current.x) * 0.1;
      currentRotationRef.current.y += (targetRotationRef.current.y - currentRotationRef.current.y) * 0.1;

      scene.rotation.x = currentRotationRef.current.x;
      scene.rotation.y = currentRotationRef.current.y;

      // Update bubbles
      Object.values(bubblesRef.current).forEach(bubbleGroup => {
        if (bubbleGroup.userData.orbitAngle !== undefined) {
          bubbleGroup.userData.orbitAngle += bubbleGroup.userData.orbitSpeed;
          const radius = bubbleGroup.userData.orbitRadius;
          const x = radius * Math.cos(bubbleGroup.userData.orbitAngle);
          const z = radius * Math.sin(bubbleGroup.userData.orbitAngle);
          const y = bubbleGroup.userData.initialY;
          bubbleGroup.position.set(x, y, z);

          // Make text face camera
          if (bubbleGroup.children[1]) {
            bubbleGroup.children[1].lookAt(camera.position);
          }
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }

      // Remove event listeners
      if (containerRef.current) {
        containerRef.current.removeEventListener('mousedown', onMouseDown);
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
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
