import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useGamification } from "@/context/GamificationContext";

export const useSendBubbleMessage = (bubbleId: string) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const { trackMessageSent } = useGamification();

  const sendMessage = async (content: string) => {
    if (!user || !content.trim()) return false;

    setIsSending(true);

    try {
      const username = profile?.username || user.email || "";

      const { error } = await supabase
        .from("bubble_messages")
        .insert({
          content: content.trim(),
          bubble_id: bubbleId,
          username
        });

      if (error) throw error;

      // Track message for Social Butterfly achievement
      await trackMessageSent();

      setIsSending(false);
      return true;
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Error sending message",
        description: error.message || "Please try again",
        variant: "destructive"
      });
      setIsSending(false);
      return false;
    }
  };

  return { sendMessage, isSending };
};

export const useReflectOnBubble = (bubbleId: string) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [isReflecting, setIsReflecting] = useState(false);
  const { addPoints, incrementAchievementProgress } = useGamification();

  const reflectOnBubble = async () => {
    if (!user) return false;

    setIsReflecting(true);

    try {
      const username = profile?.username || user.email || "";

      // Check if user already reflected on this bubble
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

      // Add the reflection
      const { error } = await supabase
        .from("reflects")
        .insert({
          bubble_id: bubbleId,
          username
        });

      if (error) throw error;

      // Update the reflect count on the bubble
      await supabase.rpc('increment_reflect_count', { bubble_id: bubbleId });

      // Add points for reflecting
      await addPoints(10, 'reflection');

      // Increment Reflection Master achievement progress
      await incrementAchievementProgress('reflection-master');

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
