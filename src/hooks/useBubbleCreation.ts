
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useGamification } from "@/context/GamificationContext";

// Form schema for bubble creation
const BubbleSchema = z.object({
  name: z.string().min(3, {
    message: "Bubble name must be at least 3 characters",
  }).max(50, {
    message: "Bubble name must be less than 50 characters",
  }),
  topic: z.string().min(2, {
    message: "Topic must be at least 2 characters",
  }).max(30, {
    message: "Topic must be less than 30 characters",
  }),
  description: z.string().max(200, {
    message: "Description must be less than 200 characters",
  }).optional(),
});

export type BubbleCreationForm = z.infer<typeof BubbleSchema>;

export const useBubbleCreation = (onSuccess?: () => void) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addPoints, checkAchievement } = useGamification();

  // Initialize form with react-hook-form
  const form = useForm<BubbleCreationForm>({
    resolver: zodResolver(BubbleSchema),
    defaultValues: {
      name: "",
      topic: "",
      description: "",
    },
  });

  // Function to calculate expiry time (24 hours from now)
  const calculateExpiryTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 24);
    return now.toISOString();
  };

  // Handle form submission
  const onSubmit = async (data: BubbleCreationForm) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create a bubble",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const username = profile?.username || user.email || "";
      
      // Calculate expiry time (24 hours from now)
      const expiryTime = calculateExpiryTime();
      
      // Insert new bubble
      const { data: newBubble, error } = await supabase
        .from("bubbles")
        .insert({
          name: data.name,
          topic: data.topic,
          description: data.description || null,
          username,
          size: "sm", // Default size for new bubbles
          expires_at: expiryTime,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Refresh bubbles query to show the new bubble
      queryClient.invalidateQueries({ queryKey: ["bubbles"] });
      
      // Show success toast
      toast({
        title: "Bubble created!",
        description: `Your bubble "${data.name}" has been created and will last for 24 hours`,
      });
      
      // Add points for creating a bubble
      await addPoints(20, 'bubble');
      
      // Check achievement for first bubble created
      await checkAchievement('first-bubble');
      
      // Monitor this bubble for reflections (for the "popular-bubble" achievement)
      // We'll store the bubble ID to check for reflections later
      localStorage.setItem(`bubble_created_${newBubble.id}`, JSON.stringify({
        id: newBubble.id,
        name: newBubble.name,
        createdAt: new Date().toISOString(),
        reflections: 0
      }));
      
      // Clear form
      form.reset();
      
      // Call success callback if provided
      onSuccess && onSuccess();
    } catch (error: any) {
      console.error("Error creating bubble:", error);
      toast({
        title: "Error creating bubble",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    isSubmitting,
    onSubmit: form.handleSubmit(onSubmit),
  };
};
