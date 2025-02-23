
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface BubbleWorldProps {
  topics: Array<{
    id: string;
    topic: string;
    size: "sm" | "md" | "lg";
  }>;
  onBubbleClick: (id: string) => void;
}

const BubbleWorld = ({ topics, onBubbleClick }: BubbleWorldProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    bubbles: THREE.Mesh[];
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
  }>();

  useEffect(() => {
    if (!containerRef.current) return;

    // Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 15;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 1, 1);
    scene.add(directionalLight);

    // Create bubbles
    const bubbles: THREE.Mesh[] = [];
    const bubbleGeometries = {
      sm: new THREE.SphereGeometry(1, 32, 32),
      md: new THREE.SphereGeometry(1.5, 32, 32),
      lg: new THREE.SphereGeometry(2, 32, 32),
    };

    topics.forEach((topic, index) => {
      const material = new THREE.MeshPhysicalMaterial({
        color: 0xFED766,
        transparent: true,
        opacity: 0.8,
        metalness: 0.1,
        roughness: 0.2,
        transmission: 0.5,
      });

      const bubble = new THREE.Mesh(bubbleGeometries[topic.size], material);
      
      // Distribute bubbles in a sphere
      const phi = Math.acos(-1 + (2 * index) / topics.length);
      const theta = Math.sqrt(topics.length * Math.PI) * phi;
      
      bubble.position.setFromSpherical(new THREE.Spherical(10, phi, theta));
      bubble.userData = { id: topic.id, originalPosition: bubble.position.clone() };
      
      scene.add(bubble);
      bubbles.push(bubble);
    });

    // Raycaster for interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Store references
    sceneRef.current = { scene, camera, renderer, bubbles, raycaster, mouse };

    // Animation
    let time = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      time += 0.001;

      bubbles.forEach((bubble, index) => {
        const originalPos = bubble.userData.originalPosition;
        
        // Unique floating motion for each bubble
        bubble.position.x = originalPos.x + Math.sin(time * 2 + index) * 0.5;
        bubble.position.y = originalPos.y + Math.cos(time * 1.5 + index) * 0.5;
        bubble.position.z = originalPos.z + Math.sin(time * 1.8 + index) * 0.5;
        
        bubble.rotation.x += 0.001;
        bubble.rotation.y += 0.001;
      });

      renderer.render(scene, camera);
    };

    // Event listeners
    const onMouseMove = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(bubbles);

      bubbles.forEach(bubble => {
        (bubble.material as THREE.MeshPhysicalMaterial).opacity = 0.8;
      });

      if (intersects.length > 0) {
        (intersects[0].object.material as THREE.MeshPhysicalMaterial).opacity = 1;
      }
    };

    const onClick = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(bubbles);

      if (intersects.length > 0) {
        const bubbleId = intersects[0].object.userData.id;
        onBubbleClick(bubbleId);
      }
    };

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onClick);
    window.addEventListener('resize', onResize);
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [topics, onBubbleClick]);

  return <div ref={containerRef} className="fixed inset-0 -z-10" />;
};

export default BubbleWorld;
