import React, { useRef, useState, useEffect, useMemo } from "react";
import * as THREE from "three";
import { BubbleData, BubbleWorldProps } from "@/types/bubble";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import TWEEN from "@tweenjs/tween.js";
import { geoToCartesian } from "@/utils/geoCoordinates";
import { 
  createBubbleGeometry, 
  createBubbleMaterial,
  createTextCanvas,
  calculateDynamicBubbleSize
} from "@/utils/bubbleUtils";

// Cache for textures to prevent reloading
const textureCache = new Map<string, THREE.Texture>();

const BubbleWorld: React.FC<BubbleWorldProps> = ({ 
  topics, 
  onBubbleClick,
  showEarth = true
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [scene] = useState(() => new THREE.Scene());
  const [renderer] = useState(() => new THREE.WebGLRenderer({ 
    antialias: true, 
    alpha: true,
    powerPreference: 'high-performance'
  }));
  const [camera] = useState(() => new THREE.PerspectiveCamera(75, 1, 0.1, 1000));
  const controlsRef = useRef<OrbitControls | null>(null);
  
  const bubbleRefs = useRef<THREE.Mesh[]>([]);
  const bubbleIds = useRef<string[]>([]);
  const earthRef = useRef<THREE.Object3D | null>(null);
  
  const EARTH_RADIUS = 5;
  const isInitialized = useRef(false);
  const [isEarthLoaded, setIsEarthLoaded] = useState(false);
  
  useEffect(() => {
    console.log("BubbleWorld initialization with topics:", topics?.length);
  }, [topics]);

  const bubbleMaterials = useMemo(() => {
    const brightYellow = new THREE.Color(0xFFD700);
    
    const createMaterial = () => {
      return new THREE.MeshPhysicalMaterial({
        color: brightYellow,
        emissive: 0xFFA500,
        emissiveIntensity: 0.3,
        metalness: 0.1,
        roughness: 0.1,
        transmission: 0.7,
        reflectivity: 0.6,
        clearcoat: 0.9,
        clearcoatRoughness: 0.1,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      });
    };
    
    return {
      sm: createMaterial(),
      md: createMaterial(),
      lg: createMaterial()
    };
  }, []);

  const formatExpiryTime = (expiresAt?: string): string => {
    if (!expiresAt) return "No expiry";
    
    try {
      const expiryTime = new Date(expiresAt);
      const now = new Date();
      
      if (expiryTime > now) {
        // Not expired yet - calculate remaining time
        const diffMs = expiryTime.getTime() - now.getTime();
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (diffHrs === 0) {
          return `${diffMins}m left`;
        } else {
          return `${diffHrs}h ${diffMins}m left`;
        }
      } else {
        // Already expired
        return "Expired";
      }
    } catch (e) {
      console.error("Error formatting expiry time:", e);
      return "Unknown";
    }
  };

  const addBubbleLabel = (bubble: THREE.Mesh, topic: BubbleData, size: "sm" | "md" | "lg", totalBubbles: number) => {
    if (!topic) return;
    
    const nameText = topic.name || "Unnamed";
    const topicText = topic.topic || "";
    const reflectCount = `Reflections: ${topic.reflect_count}`;
    const expiryText = formatExpiryTime(topic.expires_at);
    
    const fullText = `${nameText}\n${topicText}\n${reflectCount}\n${expiryText}`;
    
    let fontSize: number;
    
    if (totalBubbles <= 10) {
      fontSize = size === "sm" ? 24 : size === "md" ? 28 : 32;
    } else if (totalBubbles <= 30) {
      fontSize = size === "sm" ? 20 : size === "md" ? 24 : 28;
    } else {
      fontSize = size === "sm" ? 16 : size === "md" ? 20 : 24;
    }
    
    const canvas = document.createElement('canvas');
    const size2d = Math.max(256, fontSize * 10);
    canvas.width = size2d;
    canvas.height = size2d;
    
    const context = canvas.getContext('2d');
    if (!context) {
      console.error('Could not get canvas context');
      return;
    }
    
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.font = `bold ${fontSize}px Arial, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    context.shadowColor = 'rgba(255, 255, 255, 0.8)';
    context.shadowBlur = 4;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
    
    const lines = fullText.split('\n');
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    const startY = (canvas.height - totalHeight) / 2;
    
    context.fillStyle = 'rgba(255, 255, 255, 0.95)';
    
    lines.forEach((line, index) => {
      context.fillText(line, canvas.width / 2, startY + index * lineHeight);
    });
    
    let texture: THREE.Texture;
    const cacheKey = `${fullText}-${fontSize}`;
    
    if (textureCache.has(cacheKey)) {
      texture = textureCache.get(cacheKey)!;
    } else {
      texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      textureCache.set(cacheKey, texture);
    }
    
    const spriteMaterial = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true,
      sizeAttenuation: true
    });
    
    const sprite = new THREE.Sprite(spriteMaterial);
    
    let scaleFactor: number;
    
    if (totalBubbles <= 10) {
      scaleFactor = size === "sm" ? 2.0 : size === "md" ? 2.2 : 2.4;
    } else if (totalBubbles <= 30) {
      scaleFactor = size === "sm" ? 1.8 : size === "md" ? 2.0 : 2.2;
    } else {
      scaleFactor = size === "sm" ? 1.6 : size === "md" ? 1.8 : 2.0;
    }
    
    const dynamicSize = calculateDynamicBubbleSize(totalBubbles, size);
    sprite.scale.set(scaleFactor, scaleFactor, 1);
    
    sprite.position.set(0, 0, 0);
    
    bubble.add(sprite);
  };

  const loadYellowEarth = () => {
    try {
      console.log('Loading yellow-earth.glb model');
      const loader = new GLTFLoader();
      
      loader.load(
        '/models/yellow-earth.glb',
        (gltf) => {
          const earthModel = gltf.scene;
          
          earthModel.scale.set(EARTH_RADIUS, EARTH_RADIUS, EARTH_RADIUS);
          
          const earthGroup = new THREE.Group();
          earthGroup.add(earthModel);
          
          scene.add(earthGroup);
          earthRef.current = earthGroup;
          
          console.log('Yellow Earth model loaded successfully');
          setIsEarthLoaded(true);
        },
        (xhr) => {
          console.log(`${(xhr.loaded / xhr.total) * 100}% loaded`);
        },
        (error) => {
          console.error('Error loading Yellow Earth model:', error);
          addSimplifiedEarth();
        }
      );
    } catch (error) {
      console.error('Failed to load Yellow Earth model:', error);
      addSimplifiedEarth();
    }
  };

  const addSimplifiedEarth = () => {
    try {
      console.log('Adding fallback simplified Earth model');
      
      const geometry = new THREE.SphereGeometry(EARTH_RADIUS, 32, 32);
      
      const material = new THREE.MeshPhongMaterial({
        color: 0xebbd34,
        specular: 0x333333,
        shininess: 5,
        emissive: 0x664400,
        emissiveIntensity: 0.2
      });
      
      const earthMesh = new THREE.Mesh(geometry, material);
      const earthGroup = new THREE.Group();
      earthGroup.add(earthMesh);
      
      scene.add(earthGroup);
      earthRef.current = earthGroup;
      setIsEarthLoaded(true);
      
      console.log('Fallback Earth model added successfully');
    } catch (error) {
      console.error('Failed to create fallback Earth model:', error);
    }
  };

  useEffect(() => {
    if (!isInitialized.current) return;
    
    console.log("Setting up BubbleWorld scene");
    isInitialized.current = true;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    camera.position.z = 15;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    pointLight.position.set(-5, 5, 5);
    scene.add(pointLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.minDistance = 7;
    controls.maxDistance = 25;
    controlsRef.current = controls;

    if (showEarth) {
      loadYellowEarth();
    }

    const handleResize = () => {
      if (!mountRef.current) return;
      
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener("resize", handleResize);

    return () => {
      console.log("Cleaning up BubbleWorld resources");
      isInitialized.current = false;
      window.removeEventListener("resize", handleResize);
      
      if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      bubbleRefs.current.forEach((bubble) => {
        scene.remove(bubble);
        if (bubble.geometry) bubble.geometry.dispose();
        if (bubble.material instanceof THREE.Material) {
          bubble.material.dispose();
        } else if (Array.isArray(bubble.material)) {
          bubble.material.forEach((material) => material.dispose());
        }
      });
      
      if (earthRef.current) {
        scene.remove(earthRef.current);
      }
      
      textureCache.forEach(texture => texture.dispose());
      textureCache.clear();
    };
  }, [scene, renderer, camera, bubbleMaterials, showEarth]);

  useEffect(() => {
    if (!isInitialized.current) return;
    
    console.log("Starting animation loop");
    
    let frameId: number;
    
    const animate = () => {
      frameId = requestAnimationFrame(animate);
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
    
    return () => {
      console.log("Stopping animation loop");
      cancelAnimationFrame(frameId);
    };
  }, [scene, renderer, camera]);

  useEffect(() => {
    if (!isInitialized.current || !topics || topics.length === 0) {
      console.log("Not updating bubbles - initialization or topics missing");
      return;
    }
    
    if (showEarth && !isEarthLoaded) {
      console.log("Earth not loaded yet, waiting before adding bubbles");
      return;
    }
    
    console.log(`Updating bubbles: ${topics.length} bubbles to display`);
    
    bubbleRefs.current.forEach((bubble) => {
      scene.remove(bubble);
      if (bubble.geometry) bubble.geometry.dispose();
      if (bubble.material instanceof THREE.Material) {
        bubble.material.dispose();
      }
    });
    
    bubbleRefs.current = [];
    bubbleIds.current = [];

    const totalBubbles = topics.length;

    topics.forEach((topic) => {
      const dynamicSize = calculateDynamicBubbleSize(totalBubbles, topic.size);
      const geometry = createBubbleGeometry(dynamicSize);
      const material = bubbleMaterials[topic.size].clone();
      
      material.color.set(0xFFD700);
      material.emissive.set(0xFFA500);
      material.emissiveIntensity = 0.3;
      
      const bubble = new THREE.Mesh(geometry, material);
      
      if (showEarth && topic.latitude !== undefined && topic.longitude !== undefined) {
        const coords = geoToCartesian(topic.latitude, topic.longitude, EARTH_RADIUS + 0.2 + dynamicSize);
        bubble.position.set(coords.x, coords.y, coords.z);
      } else {
        const radius = 7;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        bubble.position.x = radius * Math.sin(phi) * Math.cos(theta);
        bubble.position.y = radius * Math.sin(phi) * Math.sin(theta);
        bubble.position.z = radius * Math.cos(phi);
      }
      
      addBubbleLabel(bubble, topic, topic.size, totalBubbles);
      
      scene.add(bubble);
      bubbleRefs.current.push(bubble);
      bubbleIds.current.push(topic.id);

      animateBubble(bubble, dynamicSize);
    });
    
    console.log(`Added ${bubbleRefs.current.length} bubbles to scene`);
  }, [topics, scene, bubbleMaterials, showEarth, isEarthLoaded]);

  useEffect(() => {
    if (!isInitialized.current) return;
    
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event: MouseEvent) => {
      if (!mountRef.current) return;

      const rect = mountRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(bubbleRefs.current);

      if (intersects.length > 0) {
        const clickedBubble = intersects[0].object as THREE.Mesh;
        const index = bubbleRefs.current.indexOf(clickedBubble);
        
        if (index !== -1) {
          const bubbleId = bubbleIds.current[index];
          console.log(`Bubble clicked: ${bubbleId}`);
          onBubbleClick(bubbleId);
        }
      }
    };

    mountRef.current?.addEventListener("click", handleClick);

    return () => {
      mountRef.current?.removeEventListener("click", handleClick);
    };
  }, [camera, onBubbleClick]);

  const animateBubble = (bubble: THREE.Mesh, baseSize: number) => {
    const scaleFactor = 1.08;
    const duration = 1500 + Math.random() * 1000;
    
    const tweenUp = new TWEEN.Tween(bubble.scale)
      .to({ 
        x: scaleFactor, 
        y: scaleFactor, 
        z: scaleFactor 
      }, duration)
      .easing(TWEEN.Easing.Sinusoidal.InOut);
    
    const tweenDown = new TWEEN.Tween(bubble.scale)
      .to({ 
        x: 1, 
        y: 1, 
        z: 1 
      }, duration)
      .easing(TWEEN.Easing.Sinusoidal.InOut);
    
    tweenUp.chain(tweenDown);
    tweenDown.chain(tweenUp);
    
    tweenUp.start();
  };

  return <div ref={mountRef} className="w-full h-full rounded-lg" />;
};

export default BubbleWorld;
