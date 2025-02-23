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

    // Scene setup with white background and fog for depth
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#FFFFFF');
    scene.fog = new THREE.Fog('#FFFFFF', 15, 25);

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 15;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);

    // Enhanced lighting setup for better 3D effect
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0xFFFFFF, 0.3);
    backLight.position.set(-5, -5, -5);
    scene.add(backLight);

    // Create bubbles container
    const bubbleContainer = new THREE.Group();
    scene.add(bubbleContainer);

    // Create bubbles
    topics.forEach((topic, index) => {
      const bubbleGroup = new THREE.Group();

      // Set bubble size based on type
      const bubbleSize = topic.size === 'lg' ? 1.2 : topic.size === 'md' ? 0.9 : 0.6;

      // Create bubble sphere with yellow color
      const geometry = new THREE.SphereGeometry(bubbleSize, 32, 32);
      const material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#FFE566'), // Brighter yellow
        transparent: true,
        opacity: 0.9,
        metalness: 0.1,
        roughness: 0.2,
        clearcoat: 0.5,
        clearcoatRoughness: 0.1,
      });

      const bubble = new THREE.Mesh(geometry, material);
      bubbleGroup.add(bubble);

      // Create text with better visibility
      const canvas = document.createElement('canvas');
      canvas.width = 1024; // Higher resolution for better text quality
      canvas.height = 1024;
      const context = canvas.getContext('2d');
      
      if (context) {
        context.fillStyle = '#000000';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.textRendering = 'optimizeLegibility';

        // Draw name (larger and bolder)
        context.font = `bold ${bubbleSize * 90}px Inter`;
        context.fillText(topic.name, 512, 412);

        // Draw topic
        context.font = `${bubbleSize * 70}px Inter`;
        context.fillText(topic.topic, 512, 512);

        // Draw username
        context.font = `${bubbleSize * 60}px Inter`;
        context.fillText(topic.username, 512, 612);
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      
      const textGeometry = new THREE.PlaneGeometry(bubbleSize * 2.5, bubbleSize * 2.5);
      const textMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        alphaTest: 0.1
      });

      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      bubbleGroup.add(textMesh);

      // Position bubble in orbital pattern
      const orbit = 8; // Orbit radius
      const angle = (index / topics.length) * Math.PI * 2;
      const verticalOffset = Math.sin(angle) * 2; // Vertical variation

      bubbleGroup.position.x = Math.cos(angle) * orbit;
      bubbleGroup.position.y = verticalOffset;
      bubbleGroup.position.z = Math.sin(angle) * orbit;

      // Store orbit data for animation
      bubbleGroup.userData = {
        id: topic.id,
        angle: angle,
        orbitRadius: orbit,
        verticalOffset: verticalOffset,
        rotationSpeed: 0.0005 + Math.random() * 0.0002,
        textMesh,
        initialY: verticalOffset
      };

      bubbleContainer.add(bubbleGroup);
    });

    // Raycaster for click detection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

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

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);

      // Rotate bubble container very slowly
      bubbleContainer.rotation.y += 0.0005;

      // Animate each bubble
      bubbleContainer.children.forEach((bubbleGroup) => {
        const userData = bubbleGroup.userData;
        userData.angle += userData.rotationSpeed;

        // Update bubble position in orbit
        bubbleGroup.position.x = Math.cos(userData.angle) * userData.orbitRadius;
        bubbleGroup.position.z = Math.sin(userData.angle) * userData.orbitRadius;
        
        // Gentle floating motion
        bubbleGroup.position.y = userData.initialY + Math.sin(Date.now() * 0.001) * 0.2;

        // Keep text facing camera
        if (userData.textMesh) {
          userData.textMesh.quaternion.copy(camera.quaternion);
        }
      });

      renderer.render(scene, camera);
    }

    animate();

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (containerRef.current) {
        renderer.domElement.removeEventListener('click', onClick);
        window.removeEventListener('resize', handleResize);
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
