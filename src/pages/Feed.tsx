import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BubbleData } from "@/types/bubble";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      console.log("Fetching bubbles data for feed");
      
      // Calculate the cutoff date (24 hours after expiration)
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - 48); // Current time minus 48 hours (24h bubble lifetime + 24h showing expired)
      
      // Query for bubbles that aren't more than 24 hours past expiration
      const { data, error } = await supabase
        .from('bubbles')
        .select('*')
        .gte('expires_at', cutoffDate.toISOString()) // Only show bubbles that expired less than 24h ago or not expired yet
        .order('reflect_count', { ascending: false })
        .limit(20);
      
      if (error) {
        console.error("Error fetching bubbles:", error);
        throw error;
      }
      
      console.log("Bubbles data received for feed:", data?.length || 0);
      return data.map(bubble => ({
        ...bubble,
        size: bubble.size as "sm" | "md" | "lg"
      })) as BubbleData[];
    },
    refetchInterval: 5000 // Refetch every 5 seconds for real-time updates
  });

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

  // Filter bubbles based on search and ensure proper handling of expired bubbles
  const filteredBubbles = searchQuery.trim() 
    ? bubbles.filter(bubble => 
        bubble.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bubble.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (bubble.description && bubble.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : bubbles;
    
  // Function to check if a bubble is expired but should still be shown (within 24h after expiration)
  const shouldShowExpiredBubble = (bubble: BubbleData) => {
    try {
      if (!bubble.expires_at) return false;
      
      const expiryTime = new Date(bubble.expires_at);
      const now = new Date();
      
      // If bubble is not expired, show it
      if (expiryTime > now) return true;
      
      // If bubble is expired, check if it's within 24h after expiration
      const cutoffTime = new Date(expiryTime);
      cutoffTime.setHours(cutoffTime.getHours() + 24);
      
      return now < cutoffTime;
    } catch (e) {
      console.error("Error checking bubble visibility:", e);
      return false;
    }
  };

  // Filter out bubbles that shouldn't be shown anymore
  const visibleBubbles = filteredBubbles.filter(bubble => shouldShowExpiredBubble(bubble));

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
        description: "This bubble will appear in your My Bubbles page",
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

        {/* Display message if no bubbles are available */}
        {!isLoading && visibleBubbles.length === 0 && (
          <div className="text-center py-16 bg-white/60 rounded-3xl shadow-sm backdrop-blur-sm">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-[#ebbd34]/10">
              <Sparkles className="w-8 h-8 text-[#ebbd34]" />
            </div>
            <h3 className="text-lg font-medium text-[#ebbd34]">No bubbles found</h3>
            <p className="text-gray-500 mt-2">
              {searchQuery ? "Try a different search term" : "Create a new bubble to get started!"}
            </p>
            <Link to="/">
              <Button className="mt-4 bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white">
                Create a Bubble
              </Button>
            </Link>
          </div>
        )}

        {/* TikTok-Style Vertical Scrolling Bubbles Container */}
        {visibleBubbles.length > 0 && (
          <BubbleCarousel 
            bubbles={visibleBubbles}
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
        )}
      </main>
    </div>
  );
};

export default Feed;
