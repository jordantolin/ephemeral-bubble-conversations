
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useGamification } from "@/context/GamificationContext";

export const useReflectOnBubble = (bubbleId: string) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [isReflecting, setIsReflecting] = useState(false);
  const { addPoints, incrementAchievementProgress } = useGamification();

  const reflectOnBubble = async (reflection: string) => {
    if (!user || !reflection.trim()) return false;

    setIsReflecting(true);

    try {
      const username = profile?.username || user.email || "";

      // Check if user has already reflected on this bubble
      const { data: existingReflection, error: checkError } = await supabase
        .from("reflects")
        .select("id")
        .eq("bubble_id", bubbleId)
        .eq("username", username)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingReflection) {
        toast({
          title: "Already reflected",
          description: "You have already reflected on this bubble",
          variant: "destructive"
        });
        setIsReflecting(false);
        return false;
      }

      // Insert new reflection
      const { error } = await supabase
        .from("reflects")
        .insert({
          content: reflection.trim(),
          bubble_id: bubbleId,
          username
        });

      if (error) throw error;

      // Add points for reflection
      await addPoints(10, 'reflection');
      
      // Increment progress for reflection master achievement
      await incrementAchievementProgress('reflection-master');

      toast({
        title: "Reflection added",
        description: "Your reflection has been added to the bubble",
      });

      setIsReflecting(false);
      return true;
    } catch (error: any) {
      console.error("Error reflecting on bubble:", error);
      toast({
        title: "Error reflecting on bubble",
        description: error.message || "Please try again",
        variant: "destructive"
      });
      setIsReflecting(false);
      return false;
    }
  };

  return { reflectOnBubble, isReflecting };
};
