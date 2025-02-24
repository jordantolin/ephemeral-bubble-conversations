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
  }>;
  onBubbleClick: (id: string) => void;
  onBubbleCreate?: (bubble: { topic: string; username: string; name: string }) => void;
}

const BubbleWorld = ({ topics, onBubbleClick, onBubbleCreate }: BubbleWorldProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xFFFFFF, 15, 30);
    scene.background = new THREE.Color('#FFFFFF');

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 15;
    const minDistance = 8;
    const maxDistance = 20;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      precision: 'highp'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);

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

    // Create bubble function
    const createBubble = (topicData: { id: string; topic: string; username: string; name: string; size: "sm" | "md" | "lg" }, index: number) => {
      const bubbleGroup = new THREE.Group();

      // Set bubble size based on topicData.size
      const bubbleSize = topicData.size === 'lg' ? 0.8 : topicData.size === 'md' ? 0.6 : 0.4;

      // Create the bubble sphere
      const geometry = new THREE.SphereGeometry(bubbleSize, 32, 32);
      const material = new THREE.MeshBasicMaterial({
        color: '#ebbd34',
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
      textTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

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
        textPlane,
        initialY: y
      };

      bubbles.push(bubbleGroup);
      bubbleContainer.add(bubbleGroup);

      return bubbleGroup;
    };

    // Create initial bubbles
    topics.forEach((topic, index) => {
      createBubble(topic, index);
    });

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
      camera.position.z = Math.max(minDistance, Math.min(maxDistance, newZ));
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

    // Animation loop with improved text orientation
    const animate = () => {
      requestAnimationFrame(animate);

      TWEEN.update();

      bubbles.forEach(bubbleGroup => {
        if (bubbleGroup.userData.textPlane) {
          // Make text always face the camera
          bubbleGroup.userData.textPlane.quaternion.copy(camera.quaternion);
          
          // Ensure text maintains upright orientation
          const textPlane = bubbleGroup.userData.textPlane;
          const up = new THREE.Vector3(0, 1, 0);
          const cameraDirection = new THREE.Vector3();
          camera.getWorldDirection(cameraDirection);
          
          // Adjust text rotation to stay upright
          textPlane.up.copy(up);
          textPlane.lookAt(camera.position);
        }

        if (bubbleGroup.userData.orbitAngle !== undefined) {
          bubbleGroup.userData.orbitAngle += bubbleGroup.userData.orbitSpeed;
          const x = bubbleGroup.userData.orbitRadius * Math.cos(bubbleGroup.userData.orbitAngle);
          const z = bubbleGroup.userData.orbitRadius * Math.sin(bubbleGroup.userData.orbitAngle);
          const y = bubbleGroup.userData.initialY + Math.sin(Date.now() * 0.001) * 0.3;
          bubbleGroup.position.set(x, y, z);
        }
      });

      currentRotation.x += (targetRotation.x - currentRotation.x) * 0.1;
      currentRotation.y += (targetRotation.y - currentRotation.y) * 0.1;

      bubbleContainer.rotation.x = currentRotation.x;
      bubbleContainer.rotation.y = currentRotation.y;

      renderer.render(scene, camera);
    };

    // Event listeners
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('wheel', onWheel); // Add zoom listener

    // Start animation
    animate();

    // Cleanup
    return () => {
      if (containerRef.current) {
        renderer.domElement.removeEventListener('mousedown', onMouseDown);
        renderer.domElement.removeEventListener('mousemove', onMouseMove);
        renderer.domElement.removeEventListener('mouseup', onMouseUp);
        renderer.domElement.removeEventListener('click', onClick);
        renderer.domElement.removeEventListener('wheel', onWheel); // Remove zoom listener
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [topics, onBubbleClick, selectedBubbleId, onBubbleCreate]);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 touch-none overscroll-none select-none"
    />
  );
};

export default BubbleWorld;
