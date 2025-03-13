
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useGamification } from "@/context/GamificationContext";
import { GamificationContextType } from "@/types/gamification";

export const useReflectOnBubble = (bubbleId: string) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [isReflecting, setIsReflecting] = useState(false);
  const { addPoints, checkAchievement } = useGamification() as GamificationContextType;

  const reflectOnBubble = async () => {
    if (!user) return false;

    setIsReflecting(true);

    try {
      const username = profile?.username || user.email || "";

      const { data: existingReflects } = await supabase
        .from("reflects")
        .select("id")
        .eq("bubble_id", bubbleId)
        .eq("username", username);

      if (existingReflects && existingReflects.length > 0) {
        toast({
          title: "Already Reflected",
          description: "You have already reflected on this bubble",
          variant: "default"
        });
        setIsReflecting(false);
        return false;
      }

      const { error } = await supabase
        .from("reflects")
        .insert({
          bubble_id: bubbleId,
          username
        });

      if (error) throw error;

      await supabase.rpc('increment_reflect_count', { bubble_id: bubbleId });

      await addPoints(10, 'reflection');

      // Fix: Passing 'reflection-master' to checkAchievement with proper type
      await checkAchievement('reflection-master');

      toast({
        title: "Reflection Added!",
        description: "Your reflection has been added to this bubble",
        variant: "default"
      });

      setIsReflecting(false);
      return true;
    } catch (error: any) {
      console.error("Error reflecting on bubble:", error);
      toast({
        title: "Error Adding Reflection",
        description: error.message || "Please try again",
        variant: "destructive"
      });
      setIsReflecting(false);
      return false;
    }
  };

  return { reflectOnBubble, isReflecting };
};
