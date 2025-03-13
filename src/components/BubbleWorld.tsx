import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { BubbleWorldProps } from '@/types/bubble';
import { 
  createBubbleGeometry, 
  createBubbleMaterial, 
  createTextCanvas,
} from '@/utils/bubbleUtils';
import { loadGLTFModel, setupModel } from '@/utils/modelLoader';
import { useNavigate } from 'react-router-dom';

const formatTimeRemaining = (expiryTime: Date) => {
  try {
    const now = new Date();
    const timeDiff = expiryTime.getTime() - now.getTime();
    if (timeDiff <= 0) return "Expired";
    
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  } catch (error) {
    console.error("Error formatting time remaining:", error);
    return "Time error";
  }
};

const BubbleWorld = ({ topics, onBubbleClick, onBubbleHover }: BubbleWorldProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bubblesRef = useRef<{ [key: string]: THREE.Group }>({});
  const sceneRef = useRef<THREE.Scene | null>(null);
  const animationFrameRef = useRef<number>();
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const centralWorldRef = useRef<THREE.Object3D | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const particlesRef = useRef<{[key: string]: THREE.Points}>({});
  const [modelLoaded, setModelLoaded] = useState(false);
  const interactionRef = useRef({
    isInteracting: false,
    lastX: 0,
    lastY: 0,
    rotationSpeed: { x: 0, y: 0 },
    momentum: { x: 0, y: 0 },
    zoom: {
      current: 12,
      target: 12,
      min: 3,
      max: 25
    },
    pinchDistance: 0,
    lastPinchTime: 0,
    isDragging: false,
    startX: 0,
    startY: 0,
    moveThreshold: 5
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    if (!containerRef.current) return;
    
    console.log("BubbleWorld initialization with topics:", topics);

    const container = containerRef.current;
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    scene.background = new THREE.Color('#F9F7F0');

    const width = container.clientWidth;
    const height = container.clientHeight;
    const isMobile = width < 768;

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
    
    camera.position.z = isMobile ? 10 : 12;
    camera.position.y = 1;
    
    interactionRef.current.zoom.current = camera.position.z;
    interactionRef.current.zoom.target = camera.position.z;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight('#FFFFFF', 1.5);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight('#FFFFFF', '#F5E1C0', 1.5);
    scene.add(hemisphereLight);

    const mainLight = new THREE.DirectionalLight('#FFFFFF', 2.2);
    mainLight.position.set(5, 7, 8);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    scene.add(mainLight);

    const secondaryLight = new THREE.DirectionalLight('#FFF5E0', 1.2);
    secondaryLight.position.set(-7, -5, -8);
    scene.add(secondaryLight);

    const centerLight = new THREE.PointLight('#FBE8A6', 1.5, 10);
    centerLight.position.set(0, 0, 0);
    scene.add(centerLight);

    const loadCentralWorld = async () => {
      try {
        const modelPath = '/models/yellow-earth.glb';
        
        const placeholderGeometry = new THREE.SphereGeometry(1.2, 32, 32);
        const placeholderMaterial = new THREE.MeshBasicMaterial({ 
          color: 0xebbd34,
          wireframe: true,
          transparent: true,
          opacity: 0.5
        });
        const placeholder = new THREE.Mesh(placeholderGeometry, placeholderMaterial);
        scene.add(placeholder);
        
        const model = await loadGLTFModel(modelPath, (event) => {
          const percentComplete = Math.round((event.loaded / (event.total || 1)) * 100);
          console.log(`Loading model: ${percentComplete}%`);
        });
        
        const centralWorld = setupModel(model, 1.2);
        centralWorld.position.set(0, 0, 0);
        
        scene.remove(placeholder);
        
        scene.add(centralWorld);
        centralWorldRef.current = centralWorld;
        setModelLoaded(true);
        
        console.log("Central world model loaded successfully");
      } catch (error) {
        console.error("Failed to load central world model:", error);
        
        const worldGeometry = new THREE.IcosahedronGeometry(0.8, 1);
        const worldMaterial = new THREE.MeshPhysicalMaterial({
          color: 0xebbd34,
          metalness: 0.4,
          roughness: 0.3,
          transmission: 0.2,
          clearcoat: 1.0,
          clearcoatRoughness: 0.2,
          emissive: 0x332200,
          emissiveIntensity: 0.2,
          wireframe: true,
          transparent: true,
          opacity: 0.6
        });
        
        const fallbackWorld = new THREE.Mesh(worldGeometry, worldMaterial);
        fallbackWorld.scale.set(1.2, 1.2, 1.2);
        fallbackWorld.castShadow = true;
        fallbackWorld.receiveShadow = true;
        scene.add(fallbackWorld);
        
        const fallbackWorldGroup = new THREE.Group();
        fallbackWorldGroup.add(fallbackWorld);
        centralWorldRef.current = fallbackWorldGroup;
      }
    };

    loadCentralWorld();

    scene.fog = new THREE.FogExp2('#F9F7F0', 0.03);

    const createExplosionParticles = (position: THREE.Vector3, size: number) => {
      const particleCount = 250;
      const geometry = new THREE.BufferGeometry();
      const initialPositions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        initialPositions[i3] = 0;
        initialPositions[i3 + 1] = 0;
        initialPositions[i3 + 2] = 0;
        
        const colorRand = Math.random();
        colors[i3] = 0.9 + (colorRand * 0.1);
        colors[i3 + 1] = 0.7 + (colorRand * 0.2);
        colors[i3 + 2] = 0.2 + (colorRand * 0.1);
      }
      
      geometry.setAttribute('position', new THREE.BufferAttribute(initialPositions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      
      const material = new THREE.PointsMaterial({
        size: 0.15,
        transparent: true,
        opacity: 1,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
        depthWrite: false
      });
      
      const particles = new THREE.Points(geometry, material);
      particles.position.copy(position);
      scene.add(particles);
      
      const positions = particles.geometry.attributes.position.array;
      const dirs = [];
      
      for (let i = 0; i < particleCount; i++) {
        const speed = 0.5 + Math.random() * 4.5;
        const angle1 = Math.random() * Math.PI * 2;
        const angle2 = Math.random() * Math.PI * 2;
        
        dirs.push({
          x: Math.sin(angle1) * Math.cos(angle2) * speed,
          y: Math.sin(angle1) * Math.sin(angle2) * speed, 
          z: Math.cos(angle1) * speed
        });
      }
      
      const duration = 2000;
      new TWEEN.Tween({ progress: 0, opacity: 1 })
        .to({ progress: 1, opacity: 0 }, duration)
        .easing(TWEEN.Easing.Exponential.Out)
        .onUpdate(({ progress, opacity }) => {
          for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            const expandFactor = progress < 0.3 
              ? progress * 3.3 
              : 1 + (progress - 0.3) * 0.5;
            
            positions[i3] = dirs[i].x * expandFactor * size;
            positions[i3 + 1] = dirs[i].y * expandFactor * size;
            positions[i3 + 2] = dirs[i].z * expandFactor * size;
          }
          particles.geometry.attributes.position.needsUpdate = true;
          
          (particles.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - (progress * 1.2));
        })
        .onComplete(() => {
          scene.remove(particles);
        })
        .start();
      
      return particles;
    };

    if (topics && topics.length > 0) {
      const numLayers = Math.min(3, Math.ceil(topics.length / 4));
      const bubblesPerLayer = Math.ceil(topics.length / numLayers);
      
      topics.forEach((topic, index) => {
        if (topic.isExploding) {
          const lastKnownBubble = bubblesRef.current[topic.id];
          if (lastKnownBubble) {
            const position = lastKnownBubble.position.clone();
            const size = topic.size === 'lg' ? 1.3 : 
                        topic.size === 'md' ? 1.0 : 0.7;
            const finalSize = size * (1 + topic.reflect_count * 0.1);
            
            particlesRef.current[topic.id] = createExplosionParticles(position, finalSize * 2);
            
            scene.remove(lastKnownBubble);
            delete bubblesRef.current[topic.id];
          }
          return;
        }
        
        const bubbleGroup = new THREE.Group();
        
        const baseSize = topic.size === 'lg' ? 1.3 : 
                        topic.size === 'md' ? 1.0 : 0.7;
        const reflectScale = 1 + (topic.reflect_count * 0.1);
        const finalSize = baseSize * reflectScale;
        
        const geometry = createBubbleGeometry(finalSize);
        const material = createBubbleMaterial();
        const bubble = new THREE.Mesh(geometry, material);
        bubble.castShadow = true;
        bubble.receiveShadow = true;
        bubbleGroup.add(bubble);

        const now = new Date();
        const expiryTime = topic.expires_at ? new Date(topic.expires_at) : new Date(now.getTime() + 24*60*60*1000);
        const timeUntilExpiry = Math.max(0, expiryTime.getTime() - now.getTime());
        const expiryRatio = timeUntilExpiry / (24*60*60*1000);
        
        if (material instanceof THREE.MeshPhysicalMaterial) {
          material.opacity = 0.5 + (expiryRatio * 0.5);
          material.transmission = 0.2 + (expiryRatio * 0.3);
          material.emissive = new THREE.Color(0xebbd34);
          material.emissiveIntensity = 0.05 + (expiryRatio * 0.25);
          material.clearcoat = 1.0;
          material.clearcoatRoughness = 0.1;
          material.metalness = 0.1;
          material.roughness = 0.2;
        }

        const layerIndex = Math.floor(index / bubblesPerLayer);
        const layerBubbleIndex = index % bubblesPerLayer;
        const angleStep = (2 * Math.PI) / bubblesPerLayer;
        const baseAngle = layerBubbleIndex * angleStep;
        
        const angleVariation = angleStep * 0.25;
        const angle = baseAngle + (Math.random() * 2 - 1) * angleVariation;
        
        const baseRadius = 3.5 + (layerIndex * 2.5);
        const radiusVariation = 0.5;
        const radius = baseRadius + (Math.random() * 2 - 1) * radiusVariation;
        
        const baseY = (layerIndex % 2 === 0) ? 0 : 1.5;
        const yVariation = 0.8;
        const y = baseY + (Math.random() * 2 - 1) * yVariation;

        bubbleGroup.userData = {
          id: topic.id,
          orbitIndex: index,
          originalScale: finalSize,
          textScales: {
            nameScale: finalSize * 1.6,
            topicScale: finalSize * 1.4,
            reflectScale: finalSize * 1.2,
            timeScale: finalSize
          },
          movement: {
            speed: (0.001 + (Math.random() * 0.0015)) * (0.5 + expiryRatio * 0.5),
            radius: radius,
            angle: angle,
            layer: layerIndex,
            verticalSpeed: (0.002 + (Math.random() * 0.001)) * expiryRatio,
            verticalRange: 0.8 + (Math.random() * 0.8) * expiryRatio,
            verticalOffset: baseY + Math.random() * Math.PI * 2,
            rotationSpeed: 0.003 + (Math.random() * 0.006),
            wobble: Math.random() * 0.002 * expiryRatio
          },
          expiryRatio,
          expiryTime
        };

        const createLabelSprite = (text: string, position: THREE.Vector3, fontSize: number) => {
          const canvas = createTextCanvas(text, fontSize);
          const texture = new THREE.CanvasTexture(canvas);
          texture.needsUpdate = true;
          
          const spriteMaterial = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true,
            depthTest: false
          });
          
          const sprite = new THREE.Sprite(spriteMaterial);
          sprite.scale.set(
            finalSize * 1.8,
            finalSize * 0.9,
            1
          );
          
          sprite.position.copy(position);
          return sprite;
        };

        bubbleGroup.add(createLabelSprite(
          topic.name,
          new THREE.Vector3(0, finalSize * 0.4, 0),
          isMobile ? 38 : 44
        ));
        
        bubbleGroup.add(createLabelSprite(
          topic.topic,
          new THREE.Vector3(0, -finalSize * 0.1, 0),
          isMobile ? 32 : 36
        ));
        
        bubbleGroup.add(createLabelSprite(
          `⭐ ${topic.reflect_count}`,
          new THREE.Vector3(0, -finalSize * 0.5, 0),
          isMobile ? 28 : 32
        ));
        
        bubbleGroup.add(createLabelSprite(
          `⏱ ${formatTimeRemaining(expiryTime)}`,
          new THREE.Vector3(0, -finalSize * 0.85, 0),
          isMobile ? 26 : 30
        ));

        bubbleGroup.position.set(
          Math.cos(angle) * radius,
          y,
          Math.sin(angle) * radius
        );
        
        bubblesRef.current[topic.id] = bubbleGroup;
        scene.add(bubbleGroup);
      });
    } else {
      console.log("No topics to render in BubbleWorld");
    }

    let initialPinchDistance = 0;
    
    const getPinchDistance = (e: TouchEvent) => {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      return Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        initialPinchDistance = getPinchDistance(e);
        interactionRef.current.pinchDistance = initialPinchDistance;
        interactionRef.current.lastPinchTime = Date.now();
      } else if (e.touches.length === 1) {
        e.preventDefault();
        const touch = e.touches[0];
        interactionRef.current.lastX = touch.clientX;
        interactionRef.current.lastY = touch.clientY;
        interactionRef.current.isInteracting = true;
        interactionRef.current.isDragging = false;
        interactionRef.current.startX = touch.clientX;
        interactionRef.current.startY = touch.clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const currentDistance = getPinchDistance(e);
        const delta = (currentDistance - interactionRef.current.pinchDistance) * 0.01;
        interactionRef.current.zoom.target = Math.max(
          interactionRef.current.zoom.min,
          Math.min(interactionRef.current.zoom.max,
            interactionRef.current.zoom.target - delta
          )
        );
        interactionRef.current.pinchDistance = currentDistance;
      } else if (e.touches.length === 1 && interactionRef.current.isInteracting) {
        e.preventDefault();
        const touch = e.touches[0];
        
        const deltaX = Math.abs(touch.clientX - interactionRef.current.startX);
        const deltaY = Math.abs(touch.clientY - interactionRef.current.startY);
        
        if (deltaX > interactionRef.current.moveThreshold || 
            deltaY > interactionRef.current.moveThreshold) {
          interactionRef.current.isDragging = true;
        }
        
        if (interactionRef.current.isDragging && centralWorldRef.current) {
          const dx = touch.clientX - interactionRef.current.lastX;
          const dy = touch.clientY - interactionRef.current.lastY;
          
          centralWorldRef.current.rotation.y += dx * 0.01;
          centralWorldRef.current.rotation.x += dy * 0.01;
          
          interactionRef.current.momentum = {
            x: dx * 0.01 * 0.8,
            y: dy * 0.01 * 0.8
          };
        }
        
        interactionRef.current.lastX = touch.clientX;
        interactionRef.current.lastY = touch.clientY;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (interactionRef.current.isInteracting) {
        const wasDragging = interactionRef.current.isDragging;
        interactionRef.current.isInteracting = false;
        
        if (!wasDragging && e.changedTouches.length === 1) {
          const touch = e.changedTouches[0];
          const rect = container.getBoundingClientRect();
          const x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
          const y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
          mouseRef.current.set(x, y);
          handleBubbleClick(e);
        }
        
        if (wasDragging && centralWorldRef.current) {
          const decay = 0.95;
          const applyMomentum = () => {
            if (!centralWorldRef.current) return;
            
            const momentum = interactionRef.current.momentum;
            if (Math.abs(momentum.x) > 0.0001 || Math.abs(momentum.y) > 0.0001) {
              centralWorldRef.current.rotation.y += momentum.x;
              centralWorldRef.current.rotation.x += momentum.y;
              momentum.x *= decay;
              momentum.y *= decay;
              requestAnimationFrame(applyMomentum);
            }
          };
          
          applyMomentum();
        }
      }
    };

    const handleBubbleClick = (event: MouseEvent | TouchEvent) => {
      if (interactionRef.current.isDragging) return;
      
      const rect = container.getBoundingClientRect();
      let clientX: number;
      let clientY: number;

      if (event instanceof MouseEvent) {
        clientX = event.clientX;
        clientY = event.clientY;
      } else {
        const touch = event.changedTouches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
      }

      const x = (clientX - rect.left) / rect.width * 2 - 1;
      const y = -(clientY - rect.top) / rect.height * 2 + 1;

      if (camera) {
        mouseRef.current.set(x, y);
        raycasterRef.current.setFromCamera(mouseRef.current, camera);

        const bubbleMeshes = Object.values(bubblesRef.current).map(group => group.children[0]);
        const intersects = raycasterRef.current.intersectObjects(bubbleMeshes, true);

        if (intersects.length > 0) {
          const bubbleObject = intersects[0].object;
          let parent = bubbleObject.parent;
          while (parent && (!parent.userData || !parent.userData.id)) {
            parent = parent.parent;
          }
          
          if (parent && parent.userData && parent.userData.id) {
            const originalScale = { value: 1 };
            const targetScale = { value: 1.3 };

            new TWEEN.Tween(originalScale)
              .to(targetScale, 200)
              .easing(TWEEN.Easing.Bounce.Out)
              .onUpdate(() => {
                if (!bubbleObject) return;
                bubbleObject.scale.set(
                  originalScale.value,
                  originalScale.value,
                  originalScale.value
                );
              })
              .chain(
                new TWEEN.Tween(targetScale)
                  .to({ value: 1 }, 200)
                  .easing(TWEEN.Easing.Elastic.Out)
                  .onUpdate(() => {
                    if (!bubbleObject) return;
                    bubbleObject.scale.set(
                      targetScale.value,
                      targetScale.value,
                      targetScale.value
                    );
                  })
              )
              .start();
            
            navigate(`/bubble-chat/${parent.userData.id}`, { state: { from: 'bubbleWorld' } });
            onBubbleClick(parent.userData.id);
          }
        }
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      interactionRef.current.isInteracting = true;
      interactionRef.current.lastX = e.clientX;
      interactionRef.current.lastY = e.clientY;
      interactionRef.current.isDragging = false;
      interactionRef.current.startX = e.clientX;
      interactionRef.current.startY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!interactionRef.current.isInteracting || !centralWorldRef.current) return;

      const deltaX = Math.abs(e.clientX - interactionRef.current.startX);
      const deltaY = Math.abs(e.clientY - interactionRef.current.startY);
      
      if (deltaX > interactionRef.current.moveThreshold || 
          deltaY > interactionRef.current.moveThreshold) {
        interactionRef.current.isDragging = true;
      }
      
      if (interactionRef.current.isDragging) {
        const dx = e.clientX - interactionRef.current.lastX;
        const dy = e.clientY - interactionRef.current.lastY;

        centralWorldRef.current.rotation.y += dx * 0.005;
        centralWorldRef.current.rotation.x += dy * 0.005;

        interactionRef.current.momentum = {
          x: dx * 0.005 * 0.8,
          y: dy * 0.005 * 0.8
        };
      }

      interactionRef.current.lastX = e.clientX;
      interactionRef.current.lastY = e.clientY;
    };

    const onMouseUp = (e: MouseEvent) => {
      const wasDragging = interactionRef.current.isDragging;
      interactionRef.current.isInteracting = false;

      if (!wasDragging) {
        handleBubbleClick(e);
      }

      if (wasDragging && centralWorldRef.current) {
        const decay = 0.95;
        const applyMomentum = () => {
          if (!centralWorldRef.current) return;
          
          const momentum = interactionRef.current.momentum;
          if (Math.abs(momentum.x) > 0.0001 || Math.abs(momentum.y) > 0.0001) {
            centralWorldRef.current.rotation.y += momentum.x;
            centralWorldRef.current.rotation.x += momentum.y;
            momentum.x *= decay;
            momentum.y *= decay;
            requestAnimationFrame(applyMomentum);
          }
        };
        
        applyMomentum();
      }
    };

    const onMouseLeave = () => {
      interactionRef.current.isInteracting = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoom = interactionRef.current.zoom;
      const zoomSensitivity = 0.005 * (zoom.current / zoom.min);
      const delta = e.deltaY * zoomSensitivity;
      
      zoom.target = Math.max(zoom.min, Math.min(zoom.max, zoom.target + delta));
    };

    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: false });
    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseup', onMouseUp);
    container.addEventListener('mouseleave', onMouseLeave);
    container.addEventListener('wheel', onWheel, { passive: false });

    let time = 0;
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      time += 0.002;
      
      const zoom = interactionRef.current.zoom;
      const zoomLerpFactor = isMobile ? 0.15 : 0.1;
      zoom.current += (zoom.target - zoom.current) * zoomLerpFactor;
      if (camera) {
        camera.position.z = zoom.current;
      }

      const zoomRange = interactionRef.current.zoom.max - interactionRef.current.zoom.min;
      const normalizedZoom = (interactionRef.current.zoom.max - zoom.current) / zoomRange;
      const zoomFactor = 1 + Math.pow(normalizedZoom, 1.3);

      Object.values(bubblesRef.current).forEach(bubble => {
        const movement = bubble.userData.movement;
        const expiryRatio = bubble.userData.expiryRatio || 1;
        const layer = movement.layer || 0;
        
        const angle = time * movement.speed + movement.angle;
        const wobble = Math.sin(time * 5 * movement.wobble) * expiryRatio * 0.1;
        
        const verticalMovement = Math.sin(time * movement.verticalSpeed + movement.verticalOffset) * 
                                movement.verticalRange * (1 + (layer * 0.2));
        
        const rotationOffset = centralWorldRef.current ? 
          new THREE.Euler(
            centralWorldRef.current.rotation.x,
            centralWorldRef.current.rotation.y,
            centralWorldRef.current.rotation.z
          ) : new THREE.Euler(0, 0, 0);
        
        const x = Math.cos(angle) * movement.radius + wobble;
        const y = verticalMovement + movement.verticalOffset;
        const z = Math.sin(angle) * movement.radius + wobble;
        
        const position = new THREE.Vector3(x, y, z).applyEuler(rotationOffset);
        bubble.position.copy(position);
        
        bubble.rotation.y += movement.rotationSpeed;
        
        bubble.quaternion.copy(camera.quaternion);
        
        const origScale = bubble.userData.originalScale;
        const bubbleMesh = bubble.children[0] as THREE.Mesh;
        const scaleFactor = origScale * zoomFactor;
        bubbleMesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
        
        if (bubbleMesh.material instanceof THREE.MeshPhysicalMaterial) {
          const now = new Date();
          const expiryTime = bubble.userData.expiryTime || new Date();
          const timeUntilExpiry = Math.max(0, expiryTime.getTime() - now.getTime());
          const updatedExpiryRatio = timeUntilExpiry / (24*60*60*1000);
          bubble.userData.expiryRatio = updatedExpiryRatio;
          
          if (updatedExpiryRatio < 0.1) {
            const pulseIntensity = 0.2 + Math.sin(time * 20) * 0.2;
            bubbleMesh.material.emissiveIntensity = pulseIntensity;
            bubbleMesh.material.opacity = 0.5 + pulseIntensity * 0.5;
          }
        }
        
        if (bubble.children.length >= 4) {
          const timeRemainingSprite = bubble.children[3] as THREE.Sprite;
          if (bubble.userData.expiryTime) {
            const now = new Date();
            const expiryTime = bubble.userData.expiryTime;
            
            if (now.getTime() % 60000 < 1000) {
              const formattedTime = formatTimeRemaining(expiryTime);
              const canvas = createTextCanvas(`⏱ ${formattedTime}`, isMobile ? 26 : 30);
              const texture = new THREE.CanvasTexture(canvas);
              texture.needsUpdate = true;
              
              if (timeRemainingSprite.material instanceof THREE.SpriteMaterial) {
                timeRemainingSprite.material.map = texture;
                timeRemainingSprite.material.needsUpdate = true;
              }
            }
          }
        }
        
        for (let i = 1; i < bubble.children.length; i++) {
          const sprite = bubble.children[i] as THREE.Sprite;
          const textScales = bubble.userData.textScales;
          const textScaleFactor = zoomFactor * 0.9;
          
          let baseScale;
          let yOffset;
          if (i === 1) {
            baseScale = textScales.nameScale;
            yOffset = scaleFactor * 0.4;
          } else if (i === 2) {
            baseScale = textScales.topicScale;
            yOffset = -scaleFactor * 0.1;
          } else if (i === 3) {
            baseScale = textScales.reflectScale;
            yOffset = -scaleFactor * 0.5;
          } else {
            baseScale = textScales.timeScale;
            yOffset = -scaleFactor * 0.85;
          }
          
          sprite.scale.set(
            baseScale * textScaleFactor,
            baseScale * textScaleFactor * 0.6,
            1
          );
          sprite.position.set(0, yOffset, 0);
        }
      });

      if (!interactionRef.current.isInteracting && centralWorldRef.current) {
        centralWorldRef.current.rotation.y += 0.0003;
      }

      TWEEN.update();
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      
      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      console.log("Cleaning up BubbleWorld resources");
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (containerRef.current?.contains(rendererRef.current.domElement)) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
      }
      
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('mousedown', onMouseDown);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('mouseleave', onMouseLeave);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      
      Object.values(bubblesRef.current).forEach(group => {
        group.children.forEach(child => {
          if (child instanceof THREE.Mesh && child.geometry) {
            child.geometry.dispose();
          }
          if (child instanceof THREE.Mesh && child.material) {
            const material = Array.isArray(child.material) ? child.material : [child.material];
            material.forEach(m => m.dispose());
          }
        });
      });
      
      bubblesRef.current = {};
      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      centralWorldRef.current = null;
    };
  }, [topics, onBubbleClick, onBubbleHover,

