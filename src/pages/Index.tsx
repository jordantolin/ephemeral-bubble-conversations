
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
import { useNetworkReconnection } from "@/hooks/useNetworkReconnection";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [newBubbleDialog, setNewBubbleDialog] = useState(false);
  const { user } = useAuth();
  const { checkAchievement, addPoints, refreshGamificationProfile } = useGamification();
  const { isReconnecting } = useNetworkReconnection();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Add state to track manual refresh attempts
  const [isManuallyRefreshing, setIsManuallyRefreshing] = useState(false);
  
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
    filteredBubbles,
    isLoadingBubbles,
    bubblesError,
    bubbleDataForComponent,
    isBubbleExpired,
    handleReflect,
    handleBubbleClick
  } = useBubbleData();
  
  const searchParams = new URLSearchParams(location.search);
  const bubbleToOpen = searchParams.get('bubble');
  
  // Enhanced bubble creation with achievement tracking
  const handleCreateBubble = () => {
    setNewBubbleDialog(true);
  };

  // Manual refresh function for error cases
  const handleManualRefresh = () => {
    setIsManuallyRefreshing(true);
    // Force refetch bubbles data
    queryClient.invalidateQueries({ queryKey: ['bubbles'] });
    // After 2 seconds, reset the manual refreshing state
    setTimeout(() => {
      setIsManuallyRefreshing(false);
    }, 2000);

    // Show toast notification
    toast({
      title: "Refreshing Bubbles",
      description: "Fetching the latest bubbles from the server...",
    });
  };
  
  // Enhanced reflection with gamification
  const handleReflectWithGamification = async (bubbleId: string) => {
    try {
      await handleReflect(bubbleId);
      
      if (user) {
        // Add points for the reflection
        await addPoints(10, 'reflection');
        
        // Increment progress for the reflection master achievement
        await checkAchievement('reflection-master');
        
        // Refresh gamification profile to ensure all achievements are up to date
        await refreshGamificationProfile();
      }
    } catch (error) {
      console.error("Error in reflection with gamification:", error);
      toast({
        title: "Problem with reflection",
        description: "Your reflection was processed but points may not have been awarded.",
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
      refreshGamificationProfile().catch(err => {
        console.error("Error refreshing gamification profile:", err);
        // Don't show this error to the user since it's not critical
      });
    }
  }, [user, refreshGamificationProfile]);

  // If we detect a reconnection, refresh the bubbles data
  useEffect(() => {
    if (isReconnecting === false) {
      // Only refresh when transitioning from reconnecting to connected
      queryClient.invalidateQueries({ queryKey: ['bubbles'] });
      
      // Show toast notification
      toast({
        title: "Connection Restored",
        description: "Your connection has been restored. Data is being refreshed.",
      });
    } else if (isReconnecting === true) {
      // Let the user know we're working on reconnecting
      toast({
        title: "Connection Lost",
        description: "Trying to reconnect. Please wait...",
        variant: "destructive",
      });
    }
  }, [isReconnecting, queryClient, toast]);

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
          <BubbleWorldHeader 
            onCreateBubble={handleCreateBubble} 
            onRefresh={handleManualRefresh}
            isRefreshing={isManuallyRefreshing}
          />
          
          <BubbleWorldContent
            isLoadingBubbles={isLoadingBubbles || isManuallyRefreshing}
            bubblesError={bubblesError}
            filteredBubbles={filteredBubbles}
            bubbleDataForComponent={bubbleDataForComponent}
            onBubbleClick={handleBubbleClick}
            onCreateBubble={handleCreateBubble}
            isReconnecting={isReconnecting}
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
