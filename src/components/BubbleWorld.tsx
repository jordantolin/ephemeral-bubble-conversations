
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
  
  // Debug log for initialization
  useEffect(() => {
    console.log("BubbleWorld initialization with topics:", topics?.length);
  }, [topics]);

  // Create materials with different colors
  const bubbleMaterials = useMemo(() => {
    const brightYellow = new THREE.Color(0xebbd34);
    
    const createMaterial = () => {
      return new THREE.MeshPhysicalMaterial({
        color: brightYellow,
        emissive: 0x664400,
        emissiveIntensity: 0.3,
        metalness: 0.1,
        roughness: 0.1,
        transmission: 0.5,
        reflectivity: 0.7,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      });
    };
    
    return {
      sm: createMaterial(),
      md: createMaterial(),
      lg: createMaterial()
    };
  }, []);

  // Set up scene
  useEffect(() => {
    if (!mountRef.current || isInitialized.current) return;
    
    console.log("Setting up BubbleWorld scene");
    isInitialized.current = true;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Setup renderer
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio to improve performance
    mountRef.current.appendChild(renderer.domElement);

    // Setup camera
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    camera.position.z = 15;

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Add point light to enhance bubble visibility
    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    pointLight.position.set(-5, 5, 5);
    scene.add(pointLight);

    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.minDistance = 7; // Prevent zooming in too close
    controls.maxDistance = 25; // Prevent zooming out too far
    controlsRef.current = controls;

    if (showEarth) {
      // Load yellow-earth.glb model instead of simplified Earth
      loadYellowEarth();
    }

    // Resize handler
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
      
      // Clean up bubbles
      bubbleRefs.current.forEach((bubble) => {
        scene.remove(bubble);
        if (bubble.geometry) bubble.geometry.dispose();
        if (bubble.material instanceof THREE.Material) {
          bubble.material.dispose();
        } else if (Array.isArray(bubble.material)) {
          bubble.material.forEach((material) => material.dispose());
        }
      });
      
      // Clean up Earth
      if (earthRef.current) {
        scene.remove(earthRef.current);
      }
      
      // Clear texture cache
      textureCache.forEach(texture => texture.dispose());
      textureCache.clear();
    };
  }, [scene, renderer, camera, bubbleMaterials, showEarth]);

  // Animation loop
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

  // Load yellow-earth.glb model
  const loadYellowEarth = () => {
    try {
      console.log('Loading yellow-earth.glb model');
      const loader = new GLTFLoader();
      
      loader.load(
        '/models/yellow-earth.glb',
        (gltf) => {
          const earthModel = gltf.scene;
          
          // Scale and position the model
          earthModel.scale.set(EARTH_RADIUS, EARTH_RADIUS, EARTH_RADIUS);
          
          // Create a group for the earth model to allow rotation
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
          // Fallback to simplified Earth if model loading fails
          addSimplifiedEarth();
        }
      );
    } catch (error) {
      console.error('Failed to load Yellow Earth model:', error);
      // Fallback to simplified Earth
      addSimplifiedEarth();
    }
  };

  // Add simplified Earth for better performance (fallback)
  const addSimplifiedEarth = () => {
    try {
      console.log('Adding fallback simplified Earth model');
      
      // Create a simple sphere for Earth with yellow color
      const geometry = new THREE.SphereGeometry(EARTH_RADIUS, 32, 32);
      
      // Create a yellow material
      const material = new THREE.MeshPhongMaterial({
        color: 0xebbd34, // Yellow color matching bubbles
        specular: 0x333333,
        shininess: 5,
        emissive: 0x664400,
        emissiveIntensity: 0.2
      });
      
      // Create mesh and group
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

  // Add labels to bubbles
  const addBubbleLabel = (bubble: THREE.Mesh, text: string, size: "sm" | "md" | "lg", totalBubbles: number) => {
    if (!text) return;
    
    // Size mapping for label size - adjust based on total bubbles
    let fontSize: number;
    
    if (totalBubbles <= 10) {
      fontSize = size === "sm" ? 40 : size === "md" ? 52 : 64; // Larger text for few bubbles
    } else if (totalBubbles <= 30) {
      fontSize = size === "sm" ? 34 : size === "md" ? 46 : 58; // Medium text
    } else {
      fontSize = size === "sm" ? 28 : size === "md" ? 40 : 52; // Smaller text for many bubbles
    }
    
    // Create canvas with text
    const canvas = createTextCanvas(text, fontSize);
    
    // Create texture from canvas
    let texture: THREE.Texture;
    const cacheKey = `${text}-${fontSize}`;
    
    if (textureCache.has(cacheKey)) {
      texture = textureCache.get(cacheKey)!;
    } else {
      texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      textureCache.set(cacheKey, texture);
    }
    
    // Create sprite material with texture
    const spriteMaterial = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true,
      sizeAttenuation: true, // Enable size attenuation for better visibility
    });
    
    // Create and position sprite
    const sprite = new THREE.Sprite(spriteMaterial);
    
    // Scale sprite based on bubble size and total bubbles
    let scaleFactor: number;
    
    if (totalBubbles <= 10) {
      scaleFactor = size === "sm" ? 1.0 : size === "md" ? 1.2 : 1.4; // Larger for few bubbles
    } else if (totalBubbles <= 30) {
      scaleFactor = size === "sm" ? 0.8 : size === "md" ? 1.0 : 1.2; // Medium
    } else {
      scaleFactor = size === "sm" ? 0.6 : size === "md" ? 0.8 : 1.0; // Smaller for many bubbles
    }
    
    sprite.scale.set(scaleFactor, scaleFactor * 0.5, 1);
    
    // Position the sprite above the bubble
    const dynamicSize = calculateDynamicBubbleSize(totalBubbles, size);
    sprite.position.y = dynamicSize * 1.8;
    
    // Add sprite to bubble
    bubble.add(sprite);
  };

  // Update bubbles when topics change or earth is loaded
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
    
    // Clear existing bubbles
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

    // Add new bubbles
    topics.forEach((topic) => {
      // Calculate dynamic bubble size based on total number of bubbles
      const dynamicSize = calculateDynamicBubbleSize(totalBubbles, topic.size);
      const geometry = createBubbleGeometry(dynamicSize);
      const material = bubbleMaterials[topic.size].clone(); // Clone to avoid shared materials
      
      // Make the material brighter and more yellow
      material.color.set(0xebbd34);
      material.emissive.set(0x664400);
      material.emissiveIntensity = 0.3;
      
      const bubble = new THREE.Mesh(geometry, material);
      
      // Position bubble based on latitude and longitude if available, or random position
      if (showEarth && topic.latitude !== undefined && topic.longitude !== undefined) {
        const coords = geoToCartesian(topic.latitude, topic.longitude, EARTH_RADIUS + 0.2 + dynamicSize);
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
      
      // Add the bubble text (use text, name or topic)
      const displayText = topic.text || topic.name || topic.topic;
      addBubbleLabel(bubble, displayText, topic.size, totalBubbles);
      
      scene.add(bubble);
      bubbleRefs.current.push(bubble);
      bubbleIds.current.push(topic.id);

      // Add pulse effect
      animateBubble(bubble, dynamicSize);
    });
    
    console.log(`Added ${bubbleRefs.current.length} bubbles to scene`);
  }, [topics, scene, bubbleMaterials, showEarth, isEarthLoaded]);

  // Add click event listener
  useEffect(() => {
    if (!isInitialized.current) return;
    
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

  // Animate bubble with improved pulsing effect
  const animateBubble = (bubble: THREE.Mesh, baseSize: number) => {
    const scaleFactor = 1.08; // Slightly larger pulsing
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
