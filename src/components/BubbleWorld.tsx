
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useToast } from "@/hooks/use-toast";
import * as TWEEN from '@tweenjs/tween.js';

interface BubbleWorldProps {
  topics: Array<{
    id: string;
    topic: string;
    username: string;
    name: string;
    size: "sm" | "md" | "lg";
    created_at: string;
  }>;
  onBubbleClick: (id: string) => void;
}

const BubbleWorld = ({ topics, onBubbleClick }: BubbleWorldProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup with enhanced atmospheric fog
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xFFFFFF, 15, 30);
    scene.background = new THREE.Color('#FFFFFF');

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Camera setup with optimal viewing angle and constraints
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 15;
    const minDistance = 8;
    const maxDistance = 20;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      precision: 'highp'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);

    const bubbleContainer = new THREE.Group();
    scene.add(bubbleContainer);

    // Create bubbles for each topic
    topics.forEach((topic, index) => {
      const bubbleGroup = createBubble(topic, index);
      bubbleContainer.add(bubbleGroup);
    });

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xFFFAF0, 1);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    // Create and position bubbles
    function createBubble(topic: typeof topics[0], index: number) {
      const bubbleGroup = new THREE.Group();

      const bubbleSize = topic.size === 'lg' ? 0.8 : topic.size === 'md' ? 0.6 : 0.4;

      const geometry = new THREE.SphereGeometry(bubbleSize, 32, 32);
      const material = new THREE.MeshPhongMaterial({
        color: '#ebbd34',
        transparent: true,
        opacity: 0.8,
      });

      const bubble = new THREE.Mesh(geometry, material);
      bubbleGroup.add(bubble);

      // Create text
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const context = canvas.getContext('2d');
      
      if (context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = '#000000';

        const nameSize = topic.size === 'lg' ? 120 : topic.size === 'md' ? 100 : 80;
        const topicSize = topic.size === 'lg' ? 100 : topic.size === 'md' ? 80 : 60;
        const usernameSize = topic.size === 'lg' ? 80 : topic.size === 'md' ? 60 : 40;

        const spacingTop = topic.size === 'lg' ? 150 : topic.size === 'md' ? 120 : 90;
        const spacingBottom = topic.size === 'lg' ? 120 : topic.size === 'md' ? 90 : 60;

        context.font = `900 ${nameSize}px Inter`;
        context.fillText(topic.name, canvas.width/2, canvas.height/2 - spacingTop);

        context.font = `bold ${topicSize}px Inter`;
        context.fillText(topic.topic, canvas.width/2, canvas.height/2);

        context.font = `${usernameSize}px Inter`;
        context.fillText(topic.username, canvas.width/2, canvas.height/2 + spacingBottom);
      }

      const textTexture = new THREE.CanvasTexture(canvas);
      textTexture.minFilter = THREE.LinearFilter;
      textTexture.magFilter = THREE.LinearFilter;

      const textGeometry = new THREE.PlaneGeometry(bubbleSize * 1.6, bubbleSize * 1.6);
      const textMaterial = new THREE.MeshBasicMaterial({
        map: textTexture,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const textPlane = new THREE.Mesh(textGeometry, textMaterial);
      textPlane.position.z = bubbleSize * 0.51;
      bubbleGroup.add(textPlane);

      // Position bubble in a spiral
      const radius = 4.5;
      const angle = (index * 0.5) * Math.PI;
      const height = index * 0.2;

      const x = radius * Math.cos(angle);
      const y = height;
      const z = radius * Math.sin(angle);
      
      bubbleGroup.position.set(x, y, z);

      // Store the actual UUID from the database
      bubbleGroup.userData = {
        id: topic.id,
        orbitRadius: Math.sqrt(x * x + z * z),
        orbitSpeed: 0.001 + Math.random() * 0.001,
        orbitAxis: new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize(),
        orbitOffset: Math.random() * Math.PI * 2,
        textPlane
      };

      return bubbleGroup;
    }

    // Raycaster setup
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Click handling
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
          onBubbleClick(bubble.userData.id);
        }
      }
    };

    renderer.domElement.addEventListener('click', onClick);

    // Animation
    function animate() {
      requestAnimationFrame(animate);

      TWEEN.update();

      // Animate each bubble
      bubbleContainer.children.forEach((bubbleGroup) => {
        const userData = bubbleGroup.userData;
        userData.orbitOffset += userData.orbitSpeed;

        const quaternion = new THREE.Quaternion();
        quaternion.setFromAxisAngle(userData.orbitAxis, userData.orbitOffset);
        
        const position = new THREE.Vector3(userData.orbitRadius, 0, 0);
        position.applyQuaternion(quaternion);
        
        bubbleGroup.position.copy(position);
        
        if (userData.textPlane) {
          userData.textPlane.lookAt(camera.position);
        }
      });

      renderer.render(scene, camera);
    }

    animate();

    // Cleanup
    return () => {
      if (containerRef.current) {
        renderer.domElement.removeEventListener('click', onClick);
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
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
