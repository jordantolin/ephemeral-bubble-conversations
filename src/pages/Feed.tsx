
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BubbleData } from "@/types/bubble";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

// Custom components
import Navbar from "@/components/bubbleWorld/NavigationBar";
import BubbleCarousel from "@/components/feed/BubbleCarousel";

// Utility functions
import { 
  formatMessageTime, 
  formatDate, 
  getMessagePreview, 
  getUserColor, 
  isBubbleExpired 
} from "@/utils/feedHelpers";

const Feed = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const { user, profile } = useAuth();
  
  // Log to help with debugging
  console.log("Feed component rendering");
  
  const { data: bubbles = [], isLoading } = useQuery({
    queryKey: ['bubbles', 'top-reflected'],
    queryFn: async () => {
      console.log("Fetching bubbles data");
      const { data, error } = await supabase
        .from('bubbles')
        .select('*')
        .order('reflect_count', { ascending: false })
        .limit(20);
      
      if (error) {
        console.error("Error fetching bubbles:", error);
        throw error;
      }
      
      console.log("Bubbles data received:", data?.length || 0);
      return data.map(bubble => ({
        ...bubble,
        size: bubble.size as "sm" | "md" | "lg"
      })) as BubbleData[];
    },
    refetchInterval: 5000 // Refetch every 5 seconds for real-time updates
  });

  // Fetch recent messages for each bubble to show previews
  const { data: bubbleMessages = {}, isLoading: messagesLoading } = useQuery({
    queryKey: ['bubble-preview-messages'],
    queryFn: async () => {
      if (bubbles.length === 0) return {};
      
      const bubbleIds = bubbles.map(bubble => bubble.id);
      
      const { data, error } = await supabase
        .from('bubble_messages')
        .select('*')
        .in('bubble_id', bubbleIds)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Group messages by bubble_id
      const messagesByBubble: Record<string, any[]> = {};
      data.forEach(message => {
        if (!messagesByBubble[message.bubble_id]) {
          messagesByBubble[message.bubble_id] = [];
        }
        // Keep up to 5 most recent messages per bubble
        if (messagesByBubble[message.bubble_id].length < 5) {
          messagesByBubble[message.bubble_id].push(message);
        }
      });
      
      return messagesByBubble;
    },
    enabled: bubbles.length > 0,
    refetchInterval: 3000 // Refetch chat messages more frequently
  });

  // Fetch participant count for each bubble
  const { data: bubbleParticipants = {} } = useQuery({
    queryKey: ['bubble-participants'],
    queryFn: async () => {
      if (bubbles.length === 0) return {};
      
      const bubbleIds = bubbles.map(bubble => bubble.id);
      
      // Get unique usernames for each bubble
      const { data, error } = await supabase
        .from('bubble_messages')
        .select('bubble_id, username')
        .in('bubble_id', bubbleIds);
      
      if (error) throw error;
      
      // Count unique usernames per bubble
      const participantsByBubble: Record<string, Set<string>> = {};
      data.forEach(message => {
        if (!participantsByBubble[message.bubble_id]) {
          participantsByBubble[message.bubble_id] = new Set();
        }
        participantsByBubble[message.bubble_id].add(message.username);
      });
      
      // Convert Sets to counts
      const countsByBubble: Record<string, number> = {};
      Object.entries(participantsByBubble).forEach(([bubbleId, participants]) => {
        countsByBubble[bubbleId] = participants.size;
      });
      
      return countsByBubble;
    },
    enabled: bubbles.length > 0,
    refetchInterval: 5000 // Refetch participant counts for real-time updates
  });

  // Filter bubbles based on search
  const filteredBubbles = searchQuery.trim() 
    ? bubbles.filter(bubble => 
        bubble.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bubble.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (bubble.description && bubble.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : bubbles;

  // Handle reflecting a bubble
  const handleReflect = async (bubbleId: string, event: React.MouseEvent) => {
    event.preventDefault(); // Prevent navigation
    event.stopPropagation(); // Prevent event bubbling
    
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to reflect bubbles",
        variant: "destructive"
      });
      return;
    }

    const username = profile?.username || user?.email || "";
    
    // Add a quick visual feedback before the API call
    const button = event.currentTarget as HTMLButtonElement;
    const originalText = button.innerHTML;
    button.innerHTML = `<div class="animate-pulse">Reflecting...</div>`;
    
    try {
      const { error } = await supabase
        .from('reflects')
        .insert({ 
          bubble_id: bubbleId,
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
    } catch (error) {
      toast({
        title: "Error reflecting bubble",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      button.innerHTML = originalText;
    }
  };

  // Add global style to ensure page has the correct background
  useEffect(() => {
    // Create a style element
    const styleElement = document.createElement('style');
    
    // Set its content to include our global styles
    styleElement.textContent = `
      body {
        background-color: #FEF7E4;
        margin: 0;
        padding: 0;
      }
      
      #root {
        background-color: #FEF7E4;
        min-height: 100vh;
        width: 100%;
      }
      
      * {
        -webkit-transform-style: preserve-3d;
        transform-style: preserve-3d;
        -webkit-backface-visibility: hidden;
        backface-visibility: hidden;
      }
      
      @keyframes pulse-glow {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
      }
      
      .bg-glow {
        animation: pulse-glow 3s infinite ease-in-out;
      }
    `;
    
    // Add it to the document head
    document.head.appendChild(styleElement);
    
    // Clean up function
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#FEF7E4] w-full">
      {/* Header */}
      <Navbar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      
      <main className="container mx-auto px-4 pt-28 sm:pt-24 pb-8 bg-[#FEF7E4]">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-light text-[#ebbd34] mb-2">
            Top Bubbles
          </h1>
          <div className="h-px w-24 bg-[#ebbd34]/20 mx-auto" />
        </div>

        {/* TikTok-Style Vertical Scrolling Bubbles Container */}
        <BubbleCarousel 
          bubbles={filteredBubbles}
          isLoading={isLoading}
          bubbleMessages={bubbleMessages}
          bubbleParticipants={bubbleParticipants}
          messagesLoading={messagesLoading}
          handleReflect={handleReflect}
          formatDate={formatDate}
          getUserColor={getUserColor}
          formatMessageTime={formatMessageTime}
          getMessagePreview={getMessagePreview}
          isBubbleExpired={isBubbleExpired}
        />
      </main>
    </div>
  );
};

export default Feed;
