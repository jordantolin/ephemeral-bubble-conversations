
import { useRef } from 'react';
import * as THREE from 'three';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

export const useBubbleInteraction = () => {
  const isInteractingRef = useRef(false);
  const { toast } = useToast();

  // Handle reflect interaction with visual feedback
  const handleReflect = async (bubbleId: string, bubbleRefs: { [key: string]: THREE.Group }) => {
    if (isInteractingRef.current) return;
    isInteractingRef.current = true;
    
    // Get bubble group from refs
    const bubbleGroup = bubbleRefs[bubbleId];
    
    // Store original scale for restoration after animation
    let originalScale: THREE.Vector3 | null = null;
    if (bubbleGroup) {
      originalScale = bubbleGroup.scale.clone();
    }
    
    try {
      // Visual effect - bubble grows
      if (bubbleGroup) {
        // Animation: grow
        let scale = 1.0;
        const growInterval = setInterval(() => {
          scale += 0.05;
          bubbleGroup.scale.set(scale, scale, scale);
          
          if (scale >= 1.5) {
            clearInterval(growInterval);
            
            // After growing, add particles and shrink back
            createReflectionParticles(bubbleGroup);
            
            // Shrink back
            let shrinkScale = 1.5;
            const shrinkInterval = setInterval(() => {
              shrinkScale -= 0.1;
              if (shrinkScale <= 1.0) {
                shrinkScale = 1.0;
                clearInterval(shrinkInterval);
              }
              bubbleGroup.scale.set(shrinkScale, shrinkScale, shrinkScale);
            }, 50);
          }
        }, 50);
      }
      
      // Send reflect to database
      const user = (await supabase.auth.getSession()).data.session?.user;
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to reflect on bubbles",
          variant: "destructive"
        });
        return;
      }
      
      const { error } = await supabase
        .from('reflects')
        .insert({
          bubble_id: bubbleId,
          username: user.email
        });
      
      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Already reflected",
            description: "You've already reflected on this bubble",
            variant: "default"
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Reflection recorded!",
          description: "Your reflection has been saved",
          variant: "default"
        });
        
        // Update the bubble's reflection count in userData
        if (bubbleGroup && bubbleGroup.userData && typeof bubbleGroup.userData.reflectCount === 'number') {
          bubbleGroup.userData.reflectCount++;
        }
      }
    } catch (error) {
      console.error("Error reflecting on bubble:", error);
      toast({
        title: "Reflection Failed",
        description: "There was a problem recording your reflection",
        variant: "destructive"
      });
      
      // Restore original scale if animation was interrupted
      if (bubbleGroup && originalScale) {
        bubbleGroup.scale.copy(originalScale);
      }
    } finally {
      setTimeout(() => {
        isInteractingRef.current = false;
      }, 1000);
    }
  };
  
  // Create particle effect for reflection
  const createReflectionParticles = (bubbleGroup: THREE.Group) => {
    try {
      const particleCount = 15;
      const bubblePosition = bubbleGroup.position.clone();
      
      // Create a particle system
      const particles = new THREE.Group();
      
      for (let i = 0; i < particleCount; i++) {
        // Create particle geometry (small sphere)
        const geometry = new THREE.SphereGeometry(0.1, 8, 8);
        const material = new THREE.MeshBasicMaterial({
          color: 0xebbd34,
          transparent: true,
          opacity: 0.8
        });
        
        const particle = new THREE.Mesh(geometry, material);
        
        // Random position offset from bubble
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const radius = 1.0;
        
        particle.position.x = bubblePosition.x + radius * Math.sin(phi) * Math.cos(theta);
        particle.position.y = bubblePosition.y + radius * Math.sin(phi) * Math.sin(theta);
        particle.position.z = bubblePosition.z + radius * Math.cos(phi);
        
        // Store velocity vector for animation
        const velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2
        );
        
        // @ts-ignore - Adding custom property for animation
        particle.userData.velocity = velocity;
        // @ts-ignore - Adding custom property for animation
        particle.userData.life = 1.0;
        
        particles.add(particle);
      }
      
      // Add particles to the scene
      if (bubbleGroup.parent) {
        bubbleGroup.parent.add(particles);
      }
      
      // Animate particles
      let frame = 0;
      const maxFrames = 60;
      
      const animateParticles = () => {
        frame++;
        
        particles.children.forEach(particle => {
          // @ts-ignore - Reading custom properties
          particle.position.add(particle.userData.velocity);
          
          // @ts-ignore - Reading custom properties
          particle.userData.life -= 0.02;
          if (particle.userData.life <= 0) {
            particle.userData.life = 0;
          }
          
          // Scale down and fade out
          const scale = particle.userData.life * 0.5;
          particle.scale.set(scale, scale, scale);
          
          // Fix TypeScript error by adding type guard
          if (particle instanceof THREE.Mesh && particle.material instanceof THREE.Material) {
            particle.material.opacity = particle.userData.life * 0.6;
          }
        });
        
        // Continue animation or clean up
        if (frame < maxFrames) {
          requestAnimationFrame(animateParticles);
        } else {
          // Remove particles from scene
          if (bubbleGroup.parent) {
            bubbleGroup.parent.remove(particles);
          }
        }
      };
      
      // Start animation
      animateParticles();
      
    } catch (error) {
      console.error("Error creating reflection particles:", error);
    }
  };

  return {
    isInteractingRef,
    handleReflect
  };
};

export default useBubbleInteraction;
