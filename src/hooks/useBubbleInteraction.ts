
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export const useBubbleInteraction = (bubbleId: string) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isReflected, setIsReflected] = useState(false);
  const [reflectCount, setReflectCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Reset state when bubble ID changes
    setIsReflected(false);
    setReflectCount(0);
    setIsLoading(true);
    
    const checkReflectionStatus = async () => {
      if (!user || !profile?.username) {
        setIsLoading(false);
        return;
      }

      try {
        // Get the reflection count
        const { data: countData, error: countError } = await supabase
          .from('bubbles')
          .select('reflect_count')
          .eq('id', bubbleId)
          .single();
          
        if (countError) throw countError;
        if (countData) setReflectCount(countData.reflect_count);
        
        // Check if user already reflected
        const { data, error } = await supabase
          .from('reflects')
          .select('*')
          .eq('bubble_id', bubbleId)
          .eq('username', profile.username)
          .maybeSingle();
          
        if (error) throw error;
        setIsReflected(!!data);
      } catch (error: any) {
        console.error('Error checking reflection status:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkReflectionStatus();
  }, [bubbleId, user, profile]);

  const reflectBubble = async () => {
    if (!user || !profile?.username) {
      toast({
        title: "Authentication required",
        description: "Please log in to reflect on bubbles",
        variant: "destructive"
      });
      return;
    }
    
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      
      if (isReflected) {
        // Remove reflection
        const { error: deleteError } = await supabase
          .from('reflects')
          .delete()
          .eq('bubble_id', bubbleId)
          .eq('username', profile.username);
          
        if (deleteError) throw deleteError;
        
        // Decrement bubble's reflect count
        const { error: updateError } = await supabase
          .from('bubbles')
          .update({ reflect_count: reflectCount - 1 })
          .eq('id', bubbleId);
          
        if (updateError) throw updateError;
        
        setIsReflected(false);
        setReflectCount(prev => prev - 1);
        
        toast({
          title: "Reflection removed",
          description: "You've removed your reflection from this bubble"
        });
      } else {
        // Add reflection
        const { error: insertError } = await supabase
          .from('reflects')
          .insert({
            bubble_id: bubbleId,
            username: profile.username,
            created_at: new Date().toISOString()
          });
          
        if (insertError) throw insertError;
        
        // Increment bubble's reflect count
        const { error: updateError } = await supabase
          .from('bubbles')
          .update({ reflect_count: reflectCount + 1 })
          .eq('id', bubbleId);
          
        if (updateError) throw updateError;
        
        setIsReflected(true);
        setReflectCount(prev => prev + 1);
        
        toast({
          title: "Bubble reflected",
          description: "This bubble has been added to your reflections"
        });
      }
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ['reflectedBubbles']
      });
      
    } catch (error: any) {
      console.error('Error reflecting bubble:', error);
      toast({
        title: "Error",
        description: error.message || "There was a problem with your reflection",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isReflected,
    reflectCount,
    isLoading,
    reflectBubble
  };
};
