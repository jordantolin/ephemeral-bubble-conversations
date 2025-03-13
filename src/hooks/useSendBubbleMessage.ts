
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
