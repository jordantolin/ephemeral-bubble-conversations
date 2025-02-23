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

    // High-quality renderer with improved settings
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      precision: 'highp'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    // Create central planet with enhanced PBR materials
    const planetGeometry = new THREE.SphereGeometry(4, 64, 64);
    const planetMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xFFFFFF,
      metalness: 0.2,
      roughness: 0.3,
      transmission: 0.6,
      thickness: 0.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.0,
    });
    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
    planet.castShadow = true;
    planet.receiveShadow = true;
    scene.add(planet);

    // Enhanced lighting setup for better visual quality
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.4);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xFFFAF0, 1);
    mainLight.position.set(10, 10, 10);
    mainLight.castShadow = true;
    scene.add(mainLight);

    const fillLight = new THREE.PointLight(0xFFF5E0, 0.8, 20);
    fillLight.position.set(-5, -2, 8);
    scene.add(fillLight);

    const rimLight = new THREE.SpotLight(0xFFE4B5, 1);
    rimLight.position.set(0, 10, -10);
    scene.add(rimLight);

    // Bubble container with improved organization
    const bubbleContainer = new THREE.Group();
    scene.add(bubbleContainer);

    // Raycaster for precise interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Initialize bubbles array
    const bubbles: THREE.Group[] = [];

    // Enhanced bubble creation with visible text
      const createBubble = (topic: string, username: string, name: string, index: number, size: "sm" | "md" | "lg" = "md") => {
        const bubbleGroup = new THREE.Group();

        // Set bubble size
        const bubbleSize = size === 'lg' ? 0.8 : size === 'md' ? 0.6 : 0.4;

        // Create canvas for the bubble texture
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 2048;
        const context = canvas.getContext('2d');
        
        if (context) {
          // Create gradient with intense yellow colors
          const gradient = context.createRadialGradient(
            canvas.width/2, canvas.height/2, 0,
            canvas.width/2, canvas.height/2, canvas.width/2
          );
          gradient.addColorStop(0, '#FFFF00');
          gradient.addColorStop(0.7, '#FFD700');
          gradient.addColorStop(1, '#FFA500');
          
          // Fill background
          context.fillStyle = gradient;
          context.fillRect(0, 0, canvas.width, canvas.height);
          
          // Create a more opaque background for text area
          context.beginPath();
          context.arc(canvas.width/2, canvas.height/2, canvas.width/2.5, 0, Math.PI * 2);
          context.fillStyle = 'rgba(255, 255, 255, 0.92)'; // More opaque white background
          context.fill();

          // Add a dark border for better definition
          context.strokeStyle = 'rgba(0, 0, 0, 0.3)';
          context.lineWidth = 16;
          context.stroke();

          // Configure text rendering
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = 'high';

          // Draw dark outline for topic text
          const drawTextWithOutline = (text: string, x: number, y: number, fontSize: number, fontWeight: number) => {
            context.font = `${fontWeight} ${fontSize}px Inter`;
            
            // Draw outline
            context.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            context.lineWidth = fontSize * 0.05; // Proportional outline
            context.strokeText(text, x, y);
            
            // Draw main text
            context.fillStyle = '#000000';
            context.fillText(text, x, y);
            
            // Draw highlight
            context.fillStyle = 'rgba(255, 255, 255, 0.4)';
            context.fillText(text, x - 2, y - 2);
          };

          // Draw topic (largest and boldest)
          drawTextWithOutline(topic, canvas.width/2, canvas.height/2 - 220, 180, 900);
          
          // Draw username (medium size)
          drawTextWithOutline(username, canvas.width/2, canvas.height/2, 130, 800);
          
          // Draw name (medium size)
          drawTextWithOutline(name, canvas.width/2, canvas.height/2 + 220, 130, 800);
        }

        // Create texture with maximum quality settings
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        texture.anisotropy = 16; // Maximum anisotropic filtering
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;

        // Create the bubble with enhanced material settings
        const geometry = new THREE.SphereGeometry(bubbleSize, 32, 32);
        const material = new THREE.MeshPhysicalMaterial({
          map: texture,
          metalness: 0.1,
          roughness: 0.2,
          transmission: 0.5, // Slightly reduced transmission for better text visibility
          thickness: 0.5,
          clearcoat: 1.0,
          clearcoatRoughness: 0.1,
          emissive: 0xFFFF00,
          emissiveIntensity: 0.3,
        });

        const bubble = new THREE.Mesh(geometry, material);
        bubble.castShadow = true;
        bubble.receiveShadow = true;
        bubbleGroup.add(bubble);

        // Position the bubble group
        const totalBubbles = topics.length + 1;
        const phi = Math.acos(-1 + (2 * index) / totalBubbles);
        const theta = Math.sqrt(totalBubbles * Math.PI) * phi;
        
        const radius = 4.5;
        const x = radius * Math.sin(theta) * Math.cos(phi);
        const y = radius * Math.sin(theta) * Math.sin(phi);
        const z = radius * Math.cos(theta);
        
        bubbleGroup.position.set(x, y, z);

        // Add orbital and self-rotation animation data
        bubbleGroup.userData = {
          id: `bubble-${index}`,
          orbitAxis: new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
          ).normalize(),
          orbitSpeed: 0.001 + Math.random() * 0.001,
          orbitRadius: radius,
          orbitOffset: Math.random() * Math.PI * 2,
          selfRotationSpeed: 0.005, // Speed of bubble's self-rotation
          selfRotationAxis: new THREE.Vector3(0, 1, 0), // Rotate around Y axis
        };

        bubbles.push(bubbleGroup);
        bubbleContainer.add(bubbleGroup);
        
        // Animate new bubble entry
        bubbleGroup.scale.set(0, 0, 0);
        new TWEEN.Tween(bubbleGroup.scale)
          .to({ x: 1, y: 1, z: 1 }, 1000)
          .easing(TWEEN.Easing.Elastic.Out)
          .start();

        return bubbleGroup;
      };

      // Create initial bubbles
      topics.forEach((topic, index) => {
        createBubble(topic.topic, topic.username, topic.name, index, topic.size);
      });

    // Interaction state
    let isRotating = false;
    let isPinching = false;
    let previousMousePosition = { x: 0, y: 0 };
    let previousTouchDistance = 0;
    let targetRotation = { x: 0, y: 0 };
    let currentRotation = { x: 0, y: 0 };

    // Touch controls with smooth interactions
    const getTouchDistance = (touches: TouchList) => {
      return Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
      );
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        isPinching = true;
        previousTouchDistance = getTouchDistance(event.touches);
      } else {
        isRotating = true;
        previousMousePosition = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY
        };
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (isPinching && event.touches.length === 2) {
        const distance = getTouchDistance(event.touches);
        const delta = (previousTouchDistance - distance) * 0.03;
        camera.position.z = Math.max(minDistance, Math.min(maxDistance, camera.position.z + delta));
        previousTouchDistance = distance;
      } else if (isRotating && event.touches.length === 1) {
        const deltaX = event.touches[0].clientX - previousMousePosition.x;
        const deltaY = event.touches[0].clientY - previousMousePosition.y;

        targetRotation.x += deltaY * 0.004;
        targetRotation.y += deltaX * 0.004;

        previousMousePosition = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY
        };
      }
    };

    const handleTouchEnd = () => {
      isRotating = false;
      isPinching = false;
    };

    // Mouse controls
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

    // Smooth zoom with mouse wheel
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY * 0.008;
      camera.position.z = Math.max(minDistance, Math.min(maxDistance, camera.position.z + delta));
    };

    // Enhanced bubble interaction
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

    // Add event listeners
    const element = renderer.domElement;
    element.addEventListener('mousedown', onMouseDown);
    element.addEventListener('mousemove', onMouseMove);
    element.addEventListener('mouseup', onMouseUp);
    element.addEventListener('click', onClick);
    element.addEventListener('wheel', onWheel, { passive: false });
    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchmove', handleTouchMove);
    element.addEventListener('touchend', handleTouchEnd);

    // Animation loop with improved performance
    const animate = () => {
      requestAnimationFrame(animate);

      // Update TWEEN animations
      TWEEN.update();

      // Smooth camera rotation
      currentRotation.x += (targetRotation.x - currentRotation.x) * 0.1;
      currentRotation.y += (targetRotation.y - currentRotation.y) * 0.1;

      bubbleContainer.rotation.x = currentRotation.x;
      bubbleContainer.rotation.y = currentRotation.y;

      // Animate bubbles with improved physics and self-rotation
      bubbles.forEach(bubbleGroup => {
        const userData = bubbleGroup.userData;
        userData.orbitOffset += userData.orbitSpeed;

        // Calculate new position using quaternion rotation
        const quaternion = new THREE.Quaternion();
        quaternion.setFromAxisAngle(userData.orbitAxis, userData.orbitOffset);
        
        const position = new THREE.Vector3(userData.orbitRadius, 0, 0);
        position.applyQuaternion(quaternion);
        
        bubbleGroup.position.copy(position);

        // Add self-rotation to the bubble
        bubbleGroup.children[0].rotation.y += userData.selfRotationSpeed;
      });

      renderer.render(scene, camera);
    };

    // Handle window resize with improved performance
    const handleResize = () => {
      if (!containerRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Start animation
    animate();

    // Cleanup
    return () => {
      if (!containerRef.current) return;
      
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('touchstart', handleTouchStart);
      renderer.domElement.removeEventListener('touchmove', handleTouchMove);
      renderer.domElement.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('resize', handleResize);
      
      renderer.dispose();
      containerRef.current.removeChild(renderer.domElement);
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
