
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useGamification } from "@/context/GamificationContext";
import { generateRandomGeoCoordinates, getLocationName } from "@/utils/geoCoordinates";

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
  const [location, setLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);

  // Initialize form with react-hook-form
  const form = useForm<BubbleCreationForm>({
    resolver: zodResolver(BubbleSchema),
    defaultValues: {
      name: "",
      topic: "",
      description: "",
    },
  });

  // Get user's geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      setIsGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setLocation(coords);
          setLocationName(getLocationName(coords.latitude, coords.longitude));
          setIsGettingLocation(false);
          setLocationError(null);
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationError("Unable to get your location. Bubbles will be placed randomly.");
          setIsGettingLocation(false);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      setLocationError("Geolocation is not supported by your browser. Bubbles will be placed randomly.");
    }
  }, []);

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
      
      // Generate random coordinates if location is not available
      const bubbleLocation = location || generateRandomGeoCoordinates();
      
      // Insert new bubble with location data
      const { data: newBubble, error } = await supabase
        .from("bubbles")
        .insert({
          name: data.name,
          topic: data.topic,
          description: data.description || null,
          username,
          size: "sm", // Default size for new bubbles
          expires_at: expiryTime,
          latitude: bubbleLocation.latitude,
          longitude: bubbleLocation.longitude
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
    isGettingLocation,
    locationError,
    hasLocation: !!location,
    locationName
  };
};
