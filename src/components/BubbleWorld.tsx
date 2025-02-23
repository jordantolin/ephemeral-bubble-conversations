
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

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
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    bubbles: THREE.Mesh[];
    planet: THREE.Mesh;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
  }>();

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#FEF7E4');

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 18;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);

    // Create planet
    const planetGeometry = new THREE.SphereGeometry(8, 128, 128);
    const planetMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xFFFFFF,
      roughness: 0.4,
      metalness: 0.1,
      clearcoat: 0.3,
      transmission: 0.05,
      ior: 1.2,
    });
    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
    scene.add(planet);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1.2);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0xFFFAF0, 0xFFF5E6, 0.8);
    scene.add(hemisphereLight);

    const mainLight = new THREE.DirectionalLight(0xFFFFFF, 1.2);
    mainLight.position.set(1, 1, 1);
    scene.add(mainLight);

    // Create text inside bubbles
    const createBubbleText = (topic: string, username: string, name: string) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return null;

      canvas.width = 256;
      canvas.height = 256;
      context.fillStyle = 'rgba(255, 255, 255, 0)';
      context.fillRect(0, 0, canvas.width, canvas.height);

      // Draw topic
      context.fillStyle = 'rgba(0, 0, 0, 0.8)';
      context.font = '24px Inter';
      context.textAlign = 'center';
      context.fillText(topic, canvas.width / 2, canvas.height / 2 - 20);

      // Draw username
      context.font = '18px Inter';
      context.fillStyle = 'rgba(0, 0, 0, 0.6)';
      context.fillText(username, canvas.width / 2, canvas.height / 2 + 10);

      // Draw name
      context.font = '16px Inter';
      context.fillStyle = 'rgba(0, 0, 0, 0.5)';
      context.fillText(name, canvas.width / 2, canvas.height / 2 + 35);

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      
      const spriteMaterial = new THREE.SpriteMaterial({ 
        map: texture,
        transparent: true,
        opacity: 0.9,
      });
      
      return new THREE.Sprite(spriteMaterial);
    };

    const bubbles: THREE.Mesh[] = [];
    const bubbleGeometries = {
      sm: new THREE.SphereGeometry(1.2, 32, 32),
      md: new THREE.SphereGeometry(1.5, 32, 32),
      lg: new THREE.SphereGeometry(1.8, 32, 32),
    };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    sceneRef.current = { scene, camera, renderer, bubbles, planet, raycaster, mouse };

    topics.forEach((topic, index) => {
      const bubbleMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xFFF5E6,
        roughness: 0.2,
        metalness: 0.1,
        clearcoat: 0.4,
        transmission: 0.4,
        transparent: true,
        opacity: 0.8,
      });

      const bubble = new THREE.Mesh(bubbleGeometries[topic.size], bubbleMaterial);
      
      const phi = Math.acos(-1 + (2 * index) / topics.length);
      const theta = Math.sqrt(topics.length * Math.PI) * phi;
      
      bubble.position.setFromSpherical(new THREE.Spherical(12, phi, theta));
      bubble.userData.id = topic.id;
      
      const label = createBubbleText(topic.topic, topic.username, topic.name);
      if (label) {
        label.scale.set(2, 2, 1);
        label.position.copy(bubble.position);
        scene.add(label);
        bubble.userData.label = label;
      }
      
      scene.add(bubble);
      bubbles.push(bubble);
    });

    // Handle clicks
    const onClick = (event: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(bubbles);

      if (intersects.length > 0) {
        const bubbleId = intersects[0].object.userData.id;
        onBubbleClick(bubbleId);
      }
    };

    containerRef.current.addEventListener('click', onClick);

    // Animation
    const animate = () => {
      requestAnimationFrame(animate);

      planet.rotation.y += 0.001;
      
      bubbles.forEach((bubble, index) => {
        const time = Date.now() * 0.001;
        bubble.position.y += Math.sin(time + index) * 0.001;
        
        const label = bubble.userData.label;
        if (label) {
          label.position.copy(bubble.position);
          label.position.y += 0.2;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      containerRef.current?.removeEventListener('click', onClick);
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [topics, onBubbleClick]);

  return <div ref={containerRef} className="absolute inset-0" />;
};

export default BubbleWorld;
