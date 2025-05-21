
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useGamification } from "@/context/GamificationContext";

export const useBubbleChat = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { trackMessageSent, addPoints } = useGamification();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [cameFromBubbleWorld, setCameFromBubbleWorld] = useState(false);

  // Determine if the user came from Bubble World
  useEffect(() => {
    if (location.state && location.state.from === 'bubbleWorld') {
      setCameFromBubbleWorld(true);
    } else {
      setCameFromBubbleWorld(false);
    }
  }, [location]);

  // Fetch bubble details
  const { 
    data: bubble, 
    isLoading: bubbleLoading, 
    error: bubbleError 
  } = useQuery({
    queryKey: ['bubble', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('bubbles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    }
  });

  // Check if bubble has expired
  const isBubbleExpired = useCallback((expires_at: string | null) => {
    if (!expires_at) return false;
    return new Date(expires_at) < new Date();
  }, []);

  // Fetch messages
  const { 
    data: messages = [], 
    isLoading: messagesLoading 
  } = useQuery({
    queryKey: ['bubble-messages', id],
    queryFn: async () => {
      if (!id) return [];

      const { data, error } = await supabase
        .from('bubble_messages')
        .select('*')
        .eq('bubble_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    refetchInterval: 3000, // Realtime updates every 3 seconds
    enabled: !!id
  });

  // Reflect bubble
  const handleReflect = async () => {
    if (!id || !user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to reflect on bubbles",
        variant: "destructive"
      });
      return;
    }

    // Check if bubble has expired
    if (bubble && isBubbleExpired(bubble.expires_at)) {
      toast({
        title: "Bubble has exploded",
        description: "This bubble has expired and cannot be reflected",
        variant: "destructive"
      });
      return;
    }

    const username = profile?.username || user?.email || "";
    
    const { error } = await supabase
      .from('reflects')
      .insert({ 
        bubble_id: id,
        username
      });

    if (error) {
      if (error.code === '23505') { // Unique violation
        toast({
          title: "Already reflected",
          description: "You have already reflected this bubble",
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

    toast({
      title: "Bubble reflected!",
      description: "This bubble will appear in your profile",
    });

    // Add gamification points
    await addPoints(10, 'reflection');

    // Refresh bubble data
    queryClient.invalidateQueries({ queryKey: ['bubble', id] });
  };

  // Handle sending messages
  const handleSendMessage = async (content?: string) => {
    if (!id || !user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to send messages",
        variant: "destructive"
      });
      return;
    }

    // Check if bubble has expired
    if (bubble && isBubbleExpired(bubble.expires_at)) {
      toast({
        title: "Bubble has exploded",
        description: "This bubble has expired and cannot receive new messages",
        variant: "destructive"
      });
      return;
    }
    
    const messageContent = content || newMessage;
    if (!messageContent.trim()) return;

    const username = profile?.username || user?.email || "";

    const { error } = await supabase
      .from('bubble_messages')
      .insert({
        bubble_id: id,
        content: messageContent,
        username
      });

    if (error) {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    setNewMessage("");
    
    // Track message for gamification
    await trackMessageSent();
    
    // Refresh messages
    queryClient.invalidateQueries({ queryKey: ['bubble-messages', id] });
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Setup realtime updates
  useEffect(() => {
    if (!id) return;

    const channel = supabase.channel('chat-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bubble_messages',
          filter: `bubble_id=eq.${id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['bubble-messages', id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  // Redirect if bubble doesn't exist
  useEffect(() => {
    if (bubbleError) {
      toast({
        title: "Bubble not found",
        description: "The bubble you're looking for doesn't exist or has expired",
        variant: "destructive"
      });
      navigate('/');
    }
  }, [bubbleError, navigate, toast]);

  return {
    id,
    bubble,
    messages,
    bubbleLoading,
    messagesLoading,
    cameFromBubbleWorld,
    newMessage,
    messagesEndRef,
    isBubbleExpired,
    setNewMessage,
    handleSendMessage,
    handleReflect,
    user,
    profile
  };
};
