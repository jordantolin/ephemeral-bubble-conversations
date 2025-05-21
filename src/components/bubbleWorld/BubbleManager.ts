
import * as THREE from 'three';
import { createBubbleGeometry, createBubbleMaterial, createTextCanvas } from '@/utils/bubbleUtils';
import { BubbleData } from '@/types/bubble';
import { generatePointsOnSphere } from '@/utils/threeSceneUtils';

// Sample positions for debugging when coordinate generation fails
const fallbackPositions = [
  { x: 5, y: 0, z: 0 },
  { x: -5, y: 0, z: 0 },
  { x: 0, y: 5, z: 0 },
  { x: 0, y: -5, z: 0 },
  { x: 0, y: 0, z: 5 },
  { x: 0, y: 0, z: -5 }
];

export const useBubbleManager = (
  sceneRef: React.RefObject<THREE.Scene | null>,
  bubbleRefsRef: React.RefObject<{ [key: string]: THREE.Group }>
) => {
  const updateBubbles = (bubbles: BubbleData[]) => {
    if (!sceneRef.current || !bubbles || !Array.isArray(bubbles)) {
      return;
    }
    
    try {
      console.log("Updating bubbles in 3D world:", bubbles.length);
      
      const scene = sceneRef.current;
      const existingBubbleIds = Object.keys(bubbleRefsRef.current);
      const newBubbleIds = bubbles.map(bubble => bubble.id);
      
      // Remove bubbles that are no longer in the data
      existingBubbleIds.forEach(id => {
        if (!newBubbleIds.includes(id) && bubbleRefsRef.current[id]) {
          scene.remove(bubbleRefsRef.current[id]);
          delete bubbleRefsRef.current[id];
        }
      });
      
      // Calculate positions in a sphere formation around the center
      // Adjust radius based on number of bubbles - more bubbles need more space
      const radius = Math.max(6, Math.min(10, bubbles.length * 0.5));
      const points = generatePointsOnSphere(bubbles.length, radius, fallbackPositions);
      
      // Add or update bubbles
      bubbles.forEach((bubble, index) => {
        // Skip if bubble already exists
        if (bubbleRefsRef.current[bubble.id]) {
          return;
        }
        
        // Create new bubble
        const sizeMap = {
          'sm': 0.6,
          'md': 0.8,
          'lg': 1.0
        };
        const size = sizeMap[bubble.size] || 0.8;
        
        try {
          // Create bubble mesh
          const geometry = createBubbleGeometry(size);
          const material = createBubbleMaterial();
          const bubbleMesh = new THREE.Mesh(geometry, material);
          
          // Create text label
          const textCanvas = createTextCanvas(bubble.topic || "Untitled", 32);
          const textTexture = new THREE.CanvasTexture(textCanvas);
          const textMaterial = new THREE.SpriteMaterial({ 
            map: textTexture,
            transparent: true
          });
          const textSprite = new THREE.Sprite(textMaterial);
          textSprite.scale.set(2.5, 1.2, 1);
          textSprite.position.set(0, 0, size + 0.2);
          
          // Group bubble and text
          const group = new THREE.Group();
          group.add(bubbleMesh);
          group.add(textSprite);
          
          // Set position - use generated sphere points or fallback positions
          let position = points[index];
          if (!position) {
            // Use fallback position if sphere generation failed
            const fallbackIndex = index % fallbackPositions.length;
            position = fallbackPositions[fallbackIndex];
          }
          
          group.position.set(position.x, position.y, position.z);
          
          // Add userData for interaction
          group.userData = { 
            id: bubble.id,
            topic: bubble.topic,
            reflectCount: bubble.reflect_count || 0,
            // Add animation parameters to userData
            bobSpeed: 0.5 + Math.random() * 0.5,
            bobPhase: Math.random() * Math.PI * 2,
            rotationSpeed: {
              x: (Math.random() - 0.5) * 0.002,
              y: (Math.random() - 0.5) * 0.002,
              z: (Math.random() - 0.5) * 0.001
            }
          };
          
          // Add to scene
          scene.add(group);
          bubbleRefsRef.current[bubble.id] = group;
        } catch (e) {
          console.error(`Error creating bubble (${bubble.id}):`, e);
          // Continue with the next bubble
        }
      });
    } catch (error) {
      console.error("Error updating bubbles:", error);
    }
  };
  
  const animateBubbles = () => {
    if (!bubbleRefsRef.current) return;
    
    // Get current time for animations
    const time = Date.now() * 0.001;
    
    // Add animation to all bubbles
    Object.values(bubbleRefsRef.current).forEach((bubbleGroup) => {
      // Get animation parameters from userData or use defaults
      const bobSpeed = bubbleGroup.userData.bobSpeed || 1.0;
      const bobPhase = bubbleGroup.userData.bobPhase || 0;
      const rotSpeed = bubbleGroup.userData.rotationSpeed || { x: 0.001, y: 0.002, z: 0 };
      
      // Rotate bubbles for a more dynamic look
      bubbleGroup.rotation.x += rotSpeed.x;
      bubbleGroup.rotation.y += rotSpeed.y;
      bubbleGroup.rotation.z += rotSpeed.z;
      
      // Original position (without bobbing)
      const origPosition = {
        x: bubbleGroup.userData.origX || bubbleGroup.position.x,
        y: bubbleGroup.userData.origY || bubbleGroup.position.y,
        z: bubbleGroup.userData.origZ || bubbleGroup.position.z
      };
      
      // Store original position if not stored yet
      if (bubbleGroup.userData.origX === undefined) {
        bubbleGroup.userData.origX = origPosition.x;
        bubbleGroup.userData.origY = origPosition.y;
        bubbleGroup.userData.origZ = origPosition.z;
      }
      
      // Bobbing motion with different phases for each bubble
      const bobY = Math.sin(time * bobSpeed + bobPhase) * 0.15;
      const bobX = Math.cos(time * bobSpeed * 0.7 + bobPhase) * 0.08;
      
      // Apply bobbing motion
      bubbleGroup.position.set(
        origPosition.x + bobX,
        origPosition.y + bobY,
        origPosition.z
      );
      
      // Ensure text sprite always faces the camera by reversing parent rotation
      const textSprite = bubbleGroup.children.find(child => child instanceof THREE.Sprite);
      if (textSprite) {
        textSprite.rotation.y = -bubbleGroup.rotation.y;
        textSprite.rotation.x = -bubbleGroup.rotation.x;
      }
    });
  };
  
  return {
    updateBubbles,
    animateBubbles
  };
};
