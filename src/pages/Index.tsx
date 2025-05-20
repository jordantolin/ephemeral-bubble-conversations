
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

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [newBubbleDialog, setNewBubbleDialog] = useState(false);
  const { user } = useAuth();
  const { checkAchievement, addPoints, refreshGamificationProfile } = useGamification();
  
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
    handleBubbleClick
  } = useBubbleData();
  
  const searchParams = new URLSearchParams(location.search);
  const bubbleToOpen = searchParams.get('bubble');
  
  // Enhanced bubble creation with achievement tracking
  const handleCreateBubble = () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to create bubbles",
        variant: "destructive"
      });
      return;
    }
    
    setNewBubbleDialog(true);
    
    // We'll check the achievement when the bubble is actually created
    // in the CreateBubbleDialog component
  };
  
  // Enhanced reflection with gamification
  const handleReflectWithGamification = async (bubbleId: string) => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to reflect on bubbles",
        variant: "destructive"
      });
      return;
    }
    
    await handleReflect(bubbleId);
    
    if (user) {
      try {
        // Add points for the reflection
        await addPoints(10, 'reflection');
        
        // Increment progress for the reflection master achievement
        await checkAchievement('reflection-master');
        
        // Refresh gamification profile to ensure all achievements are up to date
        await refreshGamificationProfile();
      } catch (error) {
        console.error("Error updating gamification:", error);
        // Continue even if gamification fails
      }
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
  
  // Refresh gamification profile when the component mounts and user is available
  useEffect(() => {
    if (user) {
      refreshGamificationProfile().catch(error => {
        console.log("Non-critical error refreshing profile:", error);
      });
    }
  }, [user, refreshGamificationProfile]);

  // Force refresh of bubbles when the component mounts
  useEffect(() => {
    // This will force a refetch of bubbles data when the component mounts
    const forceRefresh = async () => {
      try {
        console.log("Forcing refresh of bubbles data on page load");
        // The actual refetch is handled within the useBubbleData hook via invalidateQueries
      } catch (error) {
        console.error("Error forcing refresh:", error);
      }
    };
    
    forceRefresh();
  }, []);

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
