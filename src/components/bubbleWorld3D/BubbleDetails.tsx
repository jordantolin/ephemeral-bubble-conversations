
import { useEffect } from 'react';
import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { createBubbleGeometry, createBubbleMaterial, createTextCanvas } from '@/utils/bubbleUtils';
import { BubbleData } from '@/types/bubble';
import { formatTimeRemaining } from './utils';

interface BubbleDetailsProps {
  topics: BubbleData[];
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  centralWorld: THREE.Mesh | null;
  bubblesRef: React.MutableRefObject<{ [key: string]: THREE.Group }>;
  particlesRef: React.MutableRefObject<{ [key: string]: THREE.Points }>;
  interactionRef: React.MutableRefObject<any>;
  isMobile: boolean;
}

const BubbleDetails = ({
  topics,
  scene,
  camera,
  centralWorld,
  bubblesRef,
  particlesRef,
  interactionRef,
  isMobile
}: BubbleDetailsProps) => {
  // Create explosion particles effect
  const createExplosionParticles = (position: THREE.Vector3, size: number) => {
    const particleCount = 250; // More particles for richer effect
    const geometry = new THREE.BufferGeometry();
    const initialPositions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    // Start all particles at center
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      initialPositions[i3] = 0;
      initialPositions[i3 + 1] = 0;
      initialPositions[i3 + 2] = 0;
      
      // Gradient from gold to amber for more vibrant explosion
      const colorRand = Math.random();
      colors[i3] = 0.9 + (colorRand * 0.1);     // R
      colors[i3 + 1] = 0.7 + (colorRand * 0.2);  // G
      colors[i3 + 2] = 0.2 + (colorRand * 0.1);  // B
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(initialPositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Enhanced particle material with better blending and size
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
    
    // More complex explosion animation
    const positions = particles.geometry.attributes.position.array;
    const dirs = [];
    
    // Create varied explosion directions
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
    
    // Two-phase animation: explosion and fade
    const duration = 2000;
    new TWEEN.Tween({ progress: 0, opacity: 1 })
      .to({ progress: 1, opacity: 0 }, duration)
      .easing(TWEEN.Easing.Exponential.Out)
      .onUpdate(({ progress, opacity }) => {
        for (let i = 0; i < particleCount; i++) {
          const i3 = i * 3;
          
          // Non-linear expansion for more natural look
          const expandFactor = progress < 0.3 
            ? progress * 3.3 
            : 1 + (progress - 0.3) * 0.5;
          
          positions[i3] = dirs[i].x * expandFactor * size;
          positions[i3 + 1] = dirs[i].y * expandFactor * size;
          positions[i3 + 2] = dirs[i].z * expandFactor * size;
        }
        particles.geometry.attributes.position.needsUpdate = true;
        
        // Fade out gradually
        (particles.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - (progress * 1.2));
      })
      .onComplete(() => {
        scene.remove(particles);
      })
      .start();
    
    return particles;
  };

  // Create and update bubble meshes
  useEffect(() => {
    if (!Array.isArray(topics) || !scene || !camera) return;
    
    console.log("Updating bubbles with topics:", topics.length);

    // Create bubbles for each topic
    topics.forEach((topic, index) => {
      // Skip if bubble is already in exploding animation
      if (topic.isExploding) {
        // Create explosion effect if not already created
        if (!particlesRef.current[topic.id]) {
          // Use the last known position or a default
          const lastKnownBubble = bubblesRef.current[topic.id];
          if (lastKnownBubble) {
            const position = lastKnownBubble.position.clone();
            const size = topic.size === 'lg' ? 1.3 : 
                        topic.size === 'md' ? 1.0 : 0.7;
            const finalSize = size * (1 + topic.reflect_count * 0.1);
            
            particlesRef.current[topic.id] = createExplosionParticles(position, finalSize * 2);
            
            // Remove the original bubble
            scene.remove(lastKnownBubble);
            delete bubblesRef.current[topic.id];
          }
        }
        return;
      }
      
      // Skip if bubble already exists
      if (bubblesRef.current[topic.id]) return;
      
      const bubbleGroup = new THREE.Group();
      
      // Larger base sizes for better visibility
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

      // Calculate time until expiry
      const now = new Date();
      const expiryTime = topic.expires_at ? new Date(topic.expires_at) : new Date(now.getTime() + 24*60*60*1000);
      const timeUntilExpiry = Math.max(0, expiryTime.getTime() - now.getTime());
      const expiryRatio = timeUntilExpiry / (24*60*60*1000); // 0-1 value, 1 is fresh, 0 is expired
      
      // Make newer bubbles more vibrant
      if (material instanceof THREE.MeshPhysicalMaterial) {
        // Enhanced bubble appearance based on expiry time
        material.opacity = 0.5 + (expiryRatio * 0.5); // More transparent as it ages
        material.transmission = 0.2 + (expiryRatio * 0.3);
        material.emissive = new THREE.Color(0xebbd34);
        material.emissiveIntensity = 0.05 + (expiryRatio * 0.25); // Stronger glow for fresh bubbles
        material.clearcoat = 1.0;
        material.clearcoatRoughness = 0.1;
        material.metalness = 0.1;
        material.roughness = 0.2;
      }

      bubbleGroup.userData = {
        id: topic.id,
        orbitIndex: index,
        originalScale: finalSize,
        textScales: {
          nameScale: finalSize * 1.6, // Larger text scales for better readability
          topicScale: finalSize * 1.4,
          reflectScale: finalSize * 1.2,
          timeScale: finalSize
        },
        // More interesting movement patterns
        movement: {
          speed: (Math.random() * 0.002 + 0.001) * (0.5 + expiryRatio * 0.5), // Slower as it ages
          radius: Math.random() * 4.0 + 2.5 + (Math.random() * expiryRatio * 2), // Wider orbits for newer bubbles
          angle: Math.random() * Math.PI * 2,
          verticalSpeed: (Math.random() * 0.004 - 0.002) * expiryRatio, // More up/down movement when fresh
          verticalRange: Math.random() * 2.5 * expiryRatio, // Higher amplitude when fresh
          verticalOffset: Math.random() * Math.PI * 2,
          rotationSpeed: Math.random() * 0.012 - 0.006,
          wobble: Math.random() * 0.003 * expiryRatio // Extra random movement
        },
        expiryRatio, // Store for animation use
        expiryTime // Store actual time
      };

      // Create text labels
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
          finalSize * 1.8, // Wider text for better readability
          finalSize * 0.9, 
          1
        );
        
        sprite.position.copy(position);
        return sprite;
      };

      // Position text labels within bubble with better spacing
      bubbleGroup.add(createLabelSprite(
        topic.name, 
        new THREE.Vector3(0, finalSize * 0.4, 0), 
        isMobile ? 38 : 44 // Larger font sizes
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
      
      // Add time remaining label
      bubbleGroup.add(createLabelSprite(
        `⏱ ${formatTimeRemaining(expiryTime)}`, 
        new THREE.Vector3(0, -finalSize * 0.85, 0), 
        isMobile ? 26 : 30
      ));

      // Set initial position
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 4.0 + 2.5;
      const y = (Math.random() - 0.5) * 5.0;
      bubbleGroup.position.set(
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius
      );
      
      bubblesRef.current[topic.id] = bubbleGroup;
      scene.add(bubbleGroup);
    });

    // Remove bubbles that are no longer in the topics list
    const currentIds = topics.map(topic => topic.id);
    Object.keys(bubblesRef.current).forEach(id => {
      if (!currentIds.includes(id) && !topics.find(t => t.id === id && t.isExploding)) {
        const bubble = bubblesRef.current[id];
        if (bubble) {
          scene.remove(bubble);
          delete bubblesRef.current[id];
        }
      }
    });

    // Cleanup function
    return () => {
      // Cleanup is handled in the parent component
    };
  }, [topics, scene, camera, isMobile, bubblesRef, particlesRef, createExplosionParticles]);

  // Animation update function for bubbles
  const updateBubbles = (time: number) => {
    if (!camera || !centralWorld) return;
    
    // Calculate zoom scaling factor
    const zoom = interactionRef.current.zoom;
    const zoomRange = interactionRef.current.zoom.max - interactionRef.current.zoom.min;
    const normalizedZoom = (interactionRef.current.zoom.max - zoom.current) / zoomRange;
    const zoomFactor = 1 + Math.pow(normalizedZoom, 1.3);

    // Update bubble positions
    Object.values(bubblesRef.current).forEach(bubble => {
      const movement = bubble.userData.movement;
      const expiryRatio = bubble.userData.expiryRatio || 1;
      
      // Calculate new position with more dynamic random movement
      const angle = time * movement.speed + movement.angle;
      const wobble = Math.sin(time * 5 * movement.wobble) * expiryRatio * 0.2;
      const verticalMovement = Math.sin(time * movement.verticalSpeed + movement.verticalOffset) * movement.verticalRange;
      
      // Apply rotation from central world for coordinated movement
      const rotationOffset = new THREE.Euler(
        centralWorld.rotation.x,
        centralWorld.rotation.y,
        centralWorld.rotation.z
      );
      
      const x = Math.cos(angle) * movement.radius + wobble;
      const y = verticalMovement;
      const z = Math.sin(angle) * movement.radius + wobble;
      
      const position = new THREE.Vector3(x, y, z).applyEuler(rotationOffset);
      bubble.position.copy(position);
      
      // Add subtle rotation to each bubble
      bubble.rotation.y += movement.rotationSpeed;
      
      // Make bubbles face camera for better text readability
      bubble.quaternion.copy(camera.quaternion);
      
      // Scale the bubble and text based on zoom level
      const origScale = bubble.userData.originalScale;
      const bubbleMesh = bubble.children[0] as THREE.Mesh;
      const scaleFactor = origScale * zoomFactor;
      bubbleMesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
      
      // Update bubble appearance based on time remaining
      if (bubbleMesh.material instanceof THREE.MeshPhysicalMaterial) {
        // Update expiry ratio
        const now = new Date();
        const expiryTime = bubble.userData.expiryTime || new Date();
        const timeUntilExpiry = Math.max(0, expiryTime.getTime() - now.getTime());
        const updatedExpiryRatio = timeUntilExpiry / (24*60*60*1000);
        bubble.userData.expiryRatio = updatedExpiryRatio;
        
        // Pulse effect as bubble gets closer to expiry
        if (updatedExpiryRatio < 0.1) {
          const pulseIntensity = 0.2 + Math.sin(time * 20) * 0.2;
          bubbleMesh.material.emissiveIntensity = pulseIntensity;
          bubbleMesh.material.opacity = 0.5 + pulseIntensity * 0.5;
        }
      }
      
      // Update time remaining label
      if (bubble.children.length >= 4) {
        const timeRemainingSprite = bubble.children[3] as THREE.Sprite;
        if (bubble.userData.expiryTime) {
          const now = new Date();
          const expiryTime = bubble.userData.expiryTime;
          
          // If it's been more than a minute, update the label
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
      
      // Scale text sprites with improved proportions
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
  };

  return { updateBubbles };
};

export default BubbleDetails;
