
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useToast } from "@/hooks/use-toast";
import TWEEN from '@tweenjs/tween.js';

interface BubbleWorldProps {
  topics: Array<{
    id: string;
    topic: string;
    username: string;
    name: string;
    size: "sm" | "md" | "lg";
  }>;
  onBubbleClick: (id: string) => void;
}

const BubbleWorld = ({ topics, onBubbleClick }: BubbleWorldProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xFFFDF7);

    // Camera setup with better initial position
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 15;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Bubble container
    const bubbleContainer = new THREE.Group();
    scene.add(bubbleContainer);

    // Create bubbles
    const bubbles: THREE.Group[] = [];
    const createBubble = (topic: string, username: string, name: string, index: number, size: "sm" | "md" | "lg") => {
      const bubbleGroup = new THREE.Group();

      // Size mapping
      const sizeMap = {
        sm: 1,
        md: 1.5,
        lg: 2
      };

      const radius = sizeMap[size];

      // Create bubble geometry
      const geometry = new THREE.SphereGeometry(radius, 32, 32);
      const material = new THREE.MeshPhongMaterial({
        color: 0xFFE566,
        transparent: true,
        opacity: 0.7,
        shininess: 50
      });

      const bubble = new THREE.Mesh(geometry, material);
      bubbleGroup.add(bubble);

      // Position bubble in a circular pattern
      const angle = (index / topics.length) * Math.PI * 2;
      const distance = 8;
      bubbleGroup.position.x = Math.cos(angle) * distance;
      bubbleGroup.position.y = Math.sin(angle) * distance;
      bubbleGroup.position.z = 0;

      // Make bubble interactive
      bubbleGroup.userData = { id: topic };

      bubbles.push(bubbleGroup);
      bubbleContainer.add(bubbleGroup);

      // Add entry animation
      bubbleGroup.scale.set(0, 0, 0);
      new TWEEN.Tween(bubbleGroup.scale)
        .to({ x: 1, y: 1, z: 1 }, 1000)
        .easing(TWEEN.Easing.Elastic.Out)
        .delay(index * 150)
        .start();

      return bubbleGroup;
    };

    // Create initial bubbles
    topics.forEach((topic, index) => {
      createBubble(topic.topic, topic.username, topic.name, index, topic.size);
    });

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return;
      
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // Animation
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Rotate bubble container slowly
      bubbleContainer.rotation.y += 0.001;

      // Update TWEEN
      TWEEN.update();

      // Render scene
      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      
      // Dispose of geometries and materials
      bubbles.forEach(bubble => {
        bubble.children.forEach(child => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            (child.material as THREE.Material).dispose();
          }
        });
      });
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
