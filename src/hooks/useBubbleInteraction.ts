
import { useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export const useBubbleInteraction = () => {
  const { toast } = useToast();
  const isInteractingRef = useRef(false);
  const targetRotationRef = useRef({ x: 0, y: 0, z: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const queryClient = useQueryClient();

  // Subscribe to real-time bubble updates
  useEffect(() => {
    const channel = supabase.channel('bubble-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'bubbles' 
        },
        (payload) => {
          // Invalidate bubbles query to trigger a refresh
          queryClient.invalidateQueries({ queryKey: ['bubbles'] });

          // Show toast for new bubbles
          if (payload.eventType === 'INSERT') {
            toast({
              title: "New Bubble Created!",
              description: `${payload.new.name} has joined the bubble world`,
            });
          }
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  const handleReflect = useCallback(async (bubbleId: string, bubbleRefs: { [key: string]: THREE.Group }) => {
    const { error } = await supabase
      .from('reflects')
      .insert({ bubble_id: bubbleId, username: "@user" });

    if (error) {
      if (error.code === '23505') {
        toast({
          title: "Already reflected",
          description: "You have already reflected this bubble",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error reflecting bubble",
          description: error.message,
          variant: "destructive"
        });
      }
      return;
    }

    const bubble = bubbleRefs[bubbleId];
    if (bubble) {
      const bubbleMesh = bubble.children[0] as THREE.Mesh;
      const material = bubbleMesh.material as THREE.MeshStandardMaterial;
      
      material.color.setHex(0xFFE500);
      material.emissiveIntensity = 0.5;

      const scale = 1.3;
      new TWEEN.Tween(bubble.scale)
        .to({ x: scale, y: scale, z: scale }, 300)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start()
        .onComplete(() => {
          new TWEEN.Tween(bubble.scale)
            .to({ 
              x: 1 + (bubble.userData.reflectCount * 0.05), 
              y: 1 + (bubble.userData.reflectCount * 0.05), 
              z: 1 + (bubble.userData.reflectCount * 0.05) 
            }, 200)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .start();
          
          new TWEEN.Tween({ intensity: 0.5 })
            .to({ intensity: 0.2 }, 500)
            .onUpdate((obj) => {
              material.emissiveIntensity = obj.intensity;
            })
            .start();
          
          material.color.setHex(0xebc942);
        });
    }

    toast({
      title: "Bubble reflected!",
      description: "This bubble will appear in your profile",
    });
  }, [toast]);

  return {
    isInteractingRef,
    targetRotationRef,
    dragStartRef,
    isDraggingRef,
    handleReflect
  };
};
