import React, { useRef, useState, useEffect, useMemo } from "react";
import * as THREE from "three";
import { BubbleData, BubbleWorldProps } from "@/types/bubble";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import TWEEN from "@tweenjs/tween.js";
import { geoToCartesian } from "@/utils/geoCoordinates";
import { getLocationName } from "@/utils/geoCoordinates";
import { createEarthGeometry, createEarthMaterial, createBubbleGeometry, createBubbleMaterial } from "@/utils/bubbleUtils";

const BubbleWorld: React.FC<BubbleWorldProps> = ({ 
  topics, 
  onBubbleClick,
  showEarth = true
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [scene] = useState(() => new THREE.Scene());
  const [renderer] = useState(() => new THREE.WebGLRenderer({ antialias: true, alpha: true }));
  const [camera] = useState(() => new THREE.PerspectiveCamera(75, 1, 0.1, 1000));
  const controlsRef = useRef<OrbitControls | null>(null);
  
  const bubbleRefs = useRef<THREE.Mesh[]>([]);
  const bubbleIds = useRef<string[]>([]);
  const earthRef = useRef<THREE.Mesh | null>(null);
  
  const EARTH_RADIUS = 5;
  const BUBBLE_BASE_SIZE = 0.15;
  
  // Create materials with different colors
  const bubbleMaterials = useMemo(() => {
    return {
      sm: createBubbleMaterial(),
      md: createBubbleMaterial(),
      lg: createBubbleMaterial()
    };
  }, []);

  // Set up scene
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Setup renderer
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    // Setup camera
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    camera.position.z = 15;

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controlsRef.current = controls;

    if (showEarth) {
      // Add Earth sphere
      addEarth();
    }

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      TWEEN.update();
      
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      if (earthRef.current) {
        earthRef.current.rotation.y += 0.0005;
      }
      
      renderer.render(scene, camera);
    };
    
    animate();

    // Resize handler
    const handleResize = () => {
      if (!mountRef.current) return;
      
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    // Clean up
    return () => {
      window.removeEventListener("resize", handleResize);
      
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      // Clean up bubbles
      bubbleRefs.current.forEach((bubble) => {
        scene.remove(bubble);
        bubble.geometry.dispose();
        if (bubble.material instanceof THREE.Material) {
          bubble.material.dispose();
        } else if (Array.isArray(bubble.material)) {
          bubble.material.forEach((material) => material.dispose());
        }
      });
      
      // Clean up Earth
      if (earthRef.current) {
        scene.remove(earthRef.current);
        earthRef.current.geometry.dispose();
        if (earthRef.current.material instanceof THREE.Material) {
          earthRef.current.material.dispose();
        }
      }
    };
  }, [scene, renderer, camera, bubbleMaterials, showEarth]);

  // Add Earth sphere
  const addEarth = () => {
    const geometry = createEarthGeometry(EARTH_RADIUS);
    const material = createEarthMaterial();
    
    const earth = new THREE.Mesh(geometry, material);
    scene.add(earth);
    earthRef.current = earth;
    
    // Fallback in case of texture loading error
    earth.addEventListener('error', () => {
      console.log('Using fallback Earth appearance');
      const fallbackMaterial = new THREE.MeshPhongMaterial({
        color: 0x2233ff,
        emissive: 0x112244,
        specular: 0x333333,
        shininess: 5,
      });
      earth.material = fallbackMaterial;
    });
  };

  // Update bubbles when topics change
  useEffect(() => {
    // Clear existing bubbles
    bubbleRefs.current.forEach((bubble) => {
      scene.remove(bubble);
      bubble.geometry.dispose();
      if (bubble.material instanceof THREE.Material) {
        bubble.material.dispose();
      }
    });
    
    bubbleRefs.current = [];
    bubbleIds.current = [];

    // Add new bubbles
    topics.forEach((topic) => {
      const sizeMultiplier = topic.size === "sm" ? 1 : topic.size === "md" ? 1.5 : 2;
      const geometry = createBubbleGeometry(BUBBLE_BASE_SIZE * sizeMultiplier);
      const material = bubbleMaterials[topic.size];
      
      const bubble = new THREE.Mesh(geometry, material);
      
      // Position bubble based on latitude and longitude if available, or random position
      if (showEarth && topic.latitude !== undefined && topic.longitude !== undefined) {
        const coords = geoToCartesian(topic.latitude, topic.longitude, EARTH_RADIUS + 0.2 + (BUBBLE_BASE_SIZE * sizeMultiplier));
        bubble.position.set(coords.x, coords.y, coords.z);
      } else {
        // Random positioning for non-geo bubbles
        const radius = 7;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        bubble.position.x = radius * Math.sin(phi) * Math.cos(theta);
        bubble.position.y = radius * Math.sin(phi) * Math.sin(theta);
        bubble.position.z = radius * Math.cos(phi);
      }
      
      scene.add(bubble);
      bubbleRefs.current.push(bubble);
      bubbleIds.current.push(topic.id);

      // Add pulse effect
      animateBubble(bubble, sizeMultiplier);
    });
  }, [topics, scene, bubbleMaterials, showEarth]);

  // Add click event listener
  useEffect(() => {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event: MouseEvent) => {
      if (!mountRef.current) return;

      // Calculate mouse position in normalized device coordinates
      const rect = mountRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Update the picking ray with the camera and mouse position
      raycaster.setFromCamera(mouse, camera);

      // Calculate objects intersecting the picking ray
      const intersects = raycaster.intersectObjects(bubbleRefs.current);

      if (intersects.length > 0) {
        // Find the index of the clicked bubble
        const clickedBubble = intersects[0].object as THREE.Mesh;
        const index = bubbleRefs.current.indexOf(clickedBubble);
        
        if (index !== -1) {
          const bubbleId = bubbleIds.current[index];
          onBubbleClick(bubbleId);
        }
      }
    };

    mountRef.current?.addEventListener("click", handleClick);

    return () => {
      mountRef.current?.removeEventListener("click", handleClick);
    };
  }, [camera, onBubbleClick]);

  // Animate bubble
  const animateBubble = (bubble: THREE.Mesh, sizeMultiplier: number) => {
    const scaleFactor = 1.05;
    const duration = 1500 + Math.random() * 1000;
    
    // Create initial tween (scale up)
    const tweenUp = new TWEEN.Tween(bubble.scale)
      .to({ 
        x: scaleFactor, 
        y: scaleFactor, 
        z: scaleFactor 
      }, duration)
      .easing(TWEEN.Easing.Sinusoidal.InOut);
    
    // Create second tween (scale down)
    const tweenDown = new TWEEN.Tween(bubble.scale)
      .to({ 
        x: 1, 
        y: 1, 
        z: 1 
      }, duration)
      .easing(TWEEN.Easing.Sinusoidal.InOut);
    
    // Chain the tweens to create a continuous loop
    tweenUp.chain(tweenDown);
    tweenDown.chain(tweenUp);
    
    // Start the animation
    tweenUp.start();
  };

  return <div ref={mountRef} className="w-full h-full rounded-lg" />;
};

export default BubbleWorld;
