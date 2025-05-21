
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
      
      // Calculate positions in a sphere formation
      const radius = Math.max(8, Math.min(15, bubbles.length * 0.8));
      const points = generatePointsOnSphere(bubbles.length, radius, fallbackPositions);
      
      // Add or update bubbles
      bubbles.forEach((bubble, index) => {
        // Skip if bubble already exists
        if (bubbleRefsRef.current[bubble.id]) {
          // Update existing bubble if needed
          return;
        }
        
        // Create new bubble
        const sizeMap = {
          'sm': 0.8,
          'md': 1.0,
          'lg': 1.2
        };
        const size = sizeMap[bubble.size] || 1.0;
        
        try {
          // Create bubble mesh
          const geometry = createBubbleGeometry(size);
          const material = createBubbleMaterial();
          const bubbleMesh = new THREE.Mesh(geometry, material);
          
          // Create text label
          const textCanvas = createTextCanvas(bubble.topic || "Untitled", 36);
          const textTexture = new THREE.CanvasTexture(textCanvas);
          const textMaterial = new THREE.SpriteMaterial({ 
            map: textTexture,
            transparent: true
          });
          const textSprite = new THREE.Sprite(textMaterial);
          textSprite.scale.set(3, 1.5, 1);
          textSprite.position.set(0, 0, size + 0.5);
          
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
            reflectCount: bubble.reflect_count || 0
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
    
    // Add subtle animation to all bubbles
    Object.values(bubbleRefsRef.current).forEach((bubbleGroup) => {
      bubbleGroup.rotation.y += 0.002;
      bubbleGroup.rotation.x += 0.001;
      
      // Small bobbing motion
      const time = Date.now() * 0.001;
      const floatY = Math.sin(time + bubbleGroup.position.x) * 0.05;
      bubbleGroup.position.y += floatY * 0.01;
    });
  };
  
  return {
    updateBubbles,
    animateBubbles
  };
};
