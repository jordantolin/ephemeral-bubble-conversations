
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useBubbleData from "@/hooks/useBubbleData";
import NavigationBar from "@/components/bubbleWorld/NavigationBar";
import BubbleWorldHeader from "@/components/bubbleWorld/BubbleWorldHeader";
import BubbleWorldContent from "@/components/bubbleWorld/BubbleWorldContent";
import CreateBubbleDialog from "@/components/bubbleWorld/CreateBubbleDialog";
import BubbleChat from "@/components/bubbleWorld/BubbleChat";
import ReconnectionIndicator from "@/components/bubbleWorld/ReconnectionIndicator";
import DailyStreakIndicator from "@/components/gamification/DailyStreakIndicator";
import AchievementPopup from "@/components/gamification/AchievementPopup";
import { useGamification } from "@/context/GamificationContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { GamificationContextType } from "@/types/gamification";

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [newBubbleDialog, setNewBubbleDialog] = useState(false);
  const { user } = useAuth();
  const { 
    checkAchievement, 
    addPoints, 
    refreshGamificationProfile, 
    incrementAchievementProgress,
    isLoading: isGamificationLoading
  } = useGamification() as GamificationContextType;
  
  const {
    searchQuery,
    setSearchQuery,
    selectedBubbleId,
    setSelectedBubbleId,
    selectedBubble,
    isLoadingBubbleDetails,
    messages,
    isLoadingMessages,
    messagesError,
    chatOpen,
    setChatOpen,
    isReconnecting,
    filteredBubbles,
    isLoadingBubbles,
    bubblesError,
    bubbleDataForComponent,
    isBubbleExpired,
    handleReflect,
    handleBubbleClick,
    // Use queryClient invalidation as a temporary workaround
    // while we add refreshBubbles to the useBubbleData hook
    refreshBubbles: refreshFn
  } = useBubbleData();
  
  const searchParams = new URLSearchParams(location.search);
  const bubbleToOpen = searchParams.get('bubble');
  
  // Enhanced bubble creation with achievement tracking
  const handleCreateBubble = () => {
    setNewBubbleDialog(true);
  };
  
  // Enhanced reflection with gamification
  const handleReflectWithGamification = async (bubbleId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to reflect on bubbles",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await handleReflect(bubbleId);
      
      // Add points for the reflection
      await addPoints(10, 'reflection');
      
      // Increment progress for the reflection master achievement
      await incrementAchievementProgress('reflection-master', 1);
      
      toast({
        title: "Reflection added",
        description: "Your reflection has been added to this bubble",
      });
      
      // Refresh bubbles to update UI
      if (refreshFn) {
        refreshFn();
      }
    } catch (error) {
      console.error("Error reflecting on bubble:", error);
      toast({
        title: "Error reflecting on bubble",
        description: "Please try again later",
        variant: "destructive"
      });
    }
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

  // Add a retry mechanism for bubble loading
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    
    if (bubblesError && retryCount < maxRetries) {
      const retryTimer = setTimeout(() => {
        console.log(`Retrying bubble data load (attempt ${retryCount + 1}/${maxRetries})`);
        // This will trigger a re-fetch in the useBubbleData hook
        if (refreshFn) {
          refreshFn();
        }
        retryCount++;
      }, 3000);
      
      return () => clearTimeout(retryTimer);
    }
  }, [bubblesError, refreshFn]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-secondary/20 overflow-x-hidden relative">
      {/* Reconnection indicator */}
      <ReconnectionIndicator isReconnecting={isReconnecting} />
      
      {/* Navigation */}
      <NavigationBar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      
      <div className="pt-24 md:pt-28 pb-20 md:pb-16 px-4 sm:px-6 relative z-10">
        {/* Bubble World and Filtering UI */}
        <div className="container mx-auto max-w-6xl">
          <BubbleWorldHeader onCreateBubble={handleCreateBubble} />
          
          <BubbleWorldContent
            isLoadingBubbles={isLoadingBubbles}
            bubblesError={bubblesError}
            filteredBubbles={filteredBubbles}
            bubbleDataForComponent={bubbleDataForComponent}
            onBubbleClick={handleBubbleClick}
            onCreateBubble={handleCreateBubble}
          />
        </div>
      </div>
      
      {/* New Bubble Dialog */}
      <CreateBubbleDialog 
        open={newBubbleDialog} 
        onOpenChange={setNewBubbleDialog} 
      />
      
      {/* Chat Dialog */}
      <BubbleChat
        chatOpen={chatOpen}
        setChatOpen={setChatOpen}
        selectedBubbleId={selectedBubbleId}
        selectedBubble={selectedBubble}
        isLoadingBubbleDetails={isLoadingBubbleDetails}
        messages={messages}
        isLoadingMessages={isLoadingMessages}
        messagesError={messagesError}
        isBubbleExpired={isBubbleExpired(selectedBubble)}
        handleReflect={handleReflectWithGamification}
      />
      
      {/* Gamification Components */}
      <DailyStreakIndicator />
      <AchievementPopup />
    </div>
  );
};

export default Index;
