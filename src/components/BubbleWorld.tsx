import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useToast } from "@/hooks/use-toast";
import * as TWEEN from '@tweenjs/tween.js';
import { supabase } from "@/integrations/supabase/client";
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface BubbleWorldProps {
  topics: BubbleData[];
  onBubbleClick: (id: string) => void;
}

interface BubbleData {
  id: string;
  topic: string;
  username: string;
  name: string;
  size: "sm" | "md" | "lg";
  description: string | null;
  messages: Message[];
  expires_at: string;
  reflect_count: number;
  created_at: string;
}

interface Message {
  id: string;
  content: string;
  username: string;
  timestamp: string;
}

// Type guard to check if size is valid
const isValidSize = (size: string): size is "sm" | "md" | "lg" => {
  return ["sm", "md", "lg"].includes(size);
};

const BubbleWorld = ({ topics, onBubbleClick }: BubbleWorldProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040); // Soft white light
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    camera.position.z = 5;

    // Enhanced bubble creation function with size based on reflects
    const createBubble = (topicData: BubbleData, index: number) => {
      const bubbleGroup = new THREE.Group();
      
      const expiresAt = topicData.expires_at ? new Date(topicData.expires_at) : new Date(Date.now() + 24 * 60 * 60 * 1000);
      const timeUntilExpiration = expiresAt.getTime() - Date.now();
      const lifePercentage = Math.max(0, Math.min(1, timeUntilExpiration / (24 * 60 * 60 * 1000)));
      
      const baseSize = topicData.size === 'lg' ? 0.8 : topicData.size === 'md' ? 0.6 : 0.4;
      const bubbleSize = baseSize * lifePercentage;

      const geometry = new THREE.SphereGeometry(bubbleSize, 32, 32);
      const material = new THREE.MeshPhongMaterial({
        color: '#ebbd34',
        transparent: true,
        opacity: lifePercentage,
        shininess: 100,
        specular: new THREE.Color('#ffffff'),
      });

      const bubble = new THREE.Mesh(geometry, material);
      bubbleGroup.add(bubble);

      // Create text label
      const textCanvas = document.createElement('canvas');
      const textCtx = textCanvas.getContext('2d');
      const fontSize = 24;
      textCtx!.font = `${fontSize}px Arial`;
      const text = topicData.name;
      const textWidth = textCtx!.measureText(text).width;
      textCanvas.width = textWidth;
      textCanvas.height = fontSize * 1.5;
      textCtx!.font = `${fontSize}px Arial`;
      textCtx!.fillStyle = 'white';
      textCtx!.fillText(text, 0, fontSize);

      const textTexture = new THREE.CanvasTexture(textCanvas);
      const textMaterial = new THREE.MeshBasicMaterial({ map: textTexture, transparent: true });
      const textGeometry = new THREE.PlaneGeometry(bubbleSize, bubbleSize / (textWidth / fontSize));
      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      textMesh.position.y = bubbleSize + 0.2;
      textMesh.position.x = -bubbleSize / 2;
      bubbleGroup.add(textMesh);

      // Position the bubble
      const angle = (index / topics.length) * Math.PI * 2;
      const radius = 3;
      bubbleGroup.position.x = radius * Math.cos(angle);
      bubbleGroup.position.y = radius * Math.sin(angle);

      bubbleGroup.userData = { id: topicData.id }; // Store the ID

      return bubbleGroup;
    };

    const bubbleGroups: THREE.Group[] = [];

    topics.forEach((topicData, index) => {
      const bubbleGroup = createBubble(topicData, index);
      scene.add(bubbleGroup);
      bubbleGroups.push(bubbleGroup);
    });

    // Explosion animation
    const explodeBubble = (bubbleGroup: THREE.Group) => {
      const initialPosition = bubbleGroup.position.clone();
      const targetPosition = new THREE.Vector3(
        initialPosition.x + (Math.random() - 0.5) * 5,
        initialPosition.y + (Math.random() - 0.5) * 5,
        initialPosition.z + (Math.random() - 0.5) * 5
      );

      new TWEEN.Tween(bubbleGroup.position)
        .to(targetPosition, 1000)
        .easing(TWEEN.Easing.Elastic.Out)
        .start();
    };

    // Raycaster for bubble clicking
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current) return;

      // Calculate mouse position in normalized device coordinates
      mouse.x = (event.clientX / containerRef.current.clientWidth) * 2 - 1;
      mouse.y = -(event.clientY / containerRef.current.clientHeight) * 2 + 1;

      // Update the raycaster with the mouse position
      raycaster.setFromCamera(mouse, camera);

      // Intersect objects
      const intersects = raycaster.intersectObjects(bubbleGroups.map(group => group.children[0]));

      if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        const bubbleGroup = bubbleGroups.find(group => group.children.includes(intersectedObject));

        if (bubbleGroup) {
          const bubbleId = bubbleGroup.userData.id;
          setSelectedBubbleId(bubbleId);
          explodeBubble(bubbleGroup);
          onBubbleClick(bubbleId);
        }
      }
    };

    containerRef.current.addEventListener('click', handleClick);

    const animate = () => {
      requestAnimationFrame(animate);
      TWEEN.update();
      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('click', handleClick);
        window.removeEventListener('resize', handleResize);
        containerRef.current.removeChild(renderer.domElement);
      }
      // Dispose of all objects in the scene
      scene.traverse((object: any) => {
        if (object.isMesh) {
          object.geometry.dispose();
          if (object.material.map) object.material.map.dispose();
          object.material.dispose();
        }
      });
      renderer.dispose();
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
