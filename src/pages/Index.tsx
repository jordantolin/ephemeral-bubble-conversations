import { useState, useEffect, Suspense, lazy } from "react";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import useBubbleData from "@/hooks/useBubbleData";
import { useOptimizedBubbleWorld } from "@/hooks/useOptimizedBubbleWorld";
import Navbar from "@/components/navigation/Navbar";
import BubbleWorldHeader from "@/components/bubbleWorld/BubbleWorldHeader";
import BubbleWorldContent from "@/components/bubbleWorld/BubbleWorldContent";
import { useGamification } from "@/context/GamificationContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNetwork } from "@/context/NetworkContext";
import { Loader2 } from "lucide-react";

// Lazy load non-essential components for better performance
const CreateBubbleDialog = lazy(() => import("@/components/bubbleWorld/CreateBubbleDialog"));
const BubbleChat = lazy(() => import("@/components/bubbleWorld/BubbleChat"));
const ReconnectionIndicator = lazy(() => import("@/components/network/ReconnectionIndicator"));

const Index = () => {
  const location = useLocation();
  const [newBubbleDialog, setNewBubbleDialog] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { checkAchievement, addPoints, refreshGamificationProfile } = useGamification();
  const { isReconnecting, isOnline } = useNetwork();
  
  // Extract search functionality from useBubbleData
  const [searchQuery, setSearchQuery] = useState("");
  const { bubbles, isLoading, error } = useOptimizedBubbleWorld(searchQuery);
  
  // Keep using the rest of useBubbleData for existing functionality
  const {
    selectedBubbleId,
    setSelectedBubbleId,
    selectedBubble,
    isLoadingBubbleDetails,
    messages,
    isLoadingMessages,
    messagesError,
    chatOpen,
    setChatOpen,
    isBubbleExpired,
    handleReflect,
  } = useBubbleData();
  
  const searchParams = new URLSearchParams(location.search);
  const bubbleToOpen = searchParams.get('bubble');
  
  // Enhanced bubble creation with achievement tracking
  const handleCreateBubble = () => {
    if (!isOnline) {
      toast({
        title: "You're offline",
        description: "Please connect to the internet to create a bubble",
        variant: "destructive"
      });
      return;
    }
    setNewBubbleDialog(true);
  };
  
  // Enhanced reflection with gamification
  const handleReflectWithGamification = async (bubbleId: string) => {
    if (!isOnline) {
      toast({
        title: "You're offline",
        description: "Please connect to the internet to reflect on bubbles",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await handleReflect(bubbleId);
      
      if (user) {
        // Add points for the reflection
        await addPoints(10, 'reflection');
        
        // Increment progress for the reflection master achievement
        await incrementAchievementProgress('reflection-master');
        
        // Refresh gamification profile to ensure all achievements are up to date
        await refreshGamificationProfile();
        
        toast({
          title: "Reflection successful!",
          description: "You've earned 10 points for your reflection",
        });
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['bubbles'] });
        queryClient.invalidateQueries({ queryKey: ['optimized-bubbles'] });
      }
    } catch (error) {
      console.error("Error during reflection:", error);
      toast({
        title: "Reflection failed",
        description: "There was an error processing your reflection",
        variant: "destructive"
      });
    }
  };
  
  // Increment achievement progress
  const incrementAchievementProgress = async (achievementId: string) => {
    await checkAchievement(achievementId);
  };

  // Open bubble chat when a bubble is clicked
  const handleBubbleClick = (bubbleId: string) => {
    setSelectedBubbleId(bubbleId);
    setChatOpen(true);
  };
  
  // Check URL params for bubble to open
  useEffect(() => {
    if (bubbleToOpen) {
      setSelectedBubbleId(bubbleToOpen);
      setChatOpen(true);
    }
  }, [bubbleToOpen, setSelectedBubbleId, setChatOpen]);

  // Check for stored bubble ID (from profile page clicks)
  useEffect(() => {
    const storedBubbleId = localStorage.getItem('openBubbleId');
    if (storedBubbleId) {
      setSelectedBubbleId(storedBubbleId);
      setChatOpen(true);
      localStorage.removeItem('openBubbleId');
    }
  }, [setSelectedBubbleId, setChatOpen]);
  
  // Refresh gamification profile when the component mounts
  useEffect(() => {
    if (user) {
      refreshGamificationProfile();
    }
  }, [user, refreshGamificationProfile]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-secondary/20 overflow-x-hidden relative">
      {/* Navigation - Only one navbar component */}
      <Navbar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      
      <div className="pt-24 md:pt-28 pb-20 md:pb-16 px-4 sm:px-6 relative z-10">
        {/* Bubble World and Filtering UI */}
        <div className="container mx-auto max-w-6xl">
          <BubbleWorldHeader 
            onCreateBubble={handleCreateBubble}
            showCreateButton={true} 
            showDescription={true}
          />
          
          <BubbleWorldContent
            isLoadingBubbles={isLoading}
            bubblesError={error}
            filteredBubbles={bubbles}
            bubbleDataForComponent={bubbles}
            onBubbleClick={handleBubbleClick}
            onCreateBubble={handleCreateBubble}
          />
        </div>
      </div>
      
      {/* Lazy loaded components */}
      <Suspense fallback={null}>
        {/* New Bubble Dialog */}
        {newBubbleDialog && (
          <CreateBubbleDialog 
            open={newBubbleDialog} 
            onOpenChange={setNewBubbleDialog} 
          />
        )}
        
        {/* Chat Dialog */}
        {chatOpen && (
          <BubbleChat
            chatOpen={chatOpen}
            setChatOpen={setChatOpen}
            selectedBubbleId={selectedBubbleId}
            selectedBubble={selectedBubble}
            isLoadingBubbleDetails={isLoadingBubbleDetails}
            messages={messages}
            isLoadingMessages={isLoadingMessages}
            messagesError={messagesError}
            isBubbleExpired={selectedBubble ? isBubbleExpired(selectedBubble) : false}
            handleReflect={handleReflectWithGamification}
          />
        )}
        
        {/* Reconnection indicator */}
        {isReconnecting && <ReconnectionIndicator isReconnecting={isReconnecting} />}
      </Suspense>
      
      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed bottom-4 right-4 bg-red-100 text-red-800 px-4 py-2 rounded-md shadow-md flex items-center">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          <span>You're offline. Some features may be limited.</span>
        </div>
      )}
    </div>
  );
};

export default Index;
