
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import useBubbleData from "@/hooks/useBubbleData";
import Navbar from "@/components/navigation/Navbar";
import BubbleWorldHeader from "@/components/bubbleWorld/BubbleWorldHeader";
import BubbleWorldContent from "@/components/bubbleWorld/BubbleWorldContent";
import CreateBubbleDialog from "@/components/bubbleWorld/CreateBubbleDialog";
import BubbleChat from "@/components/bubbleWorld/BubbleChat";
import { useGamification } from "@/context/GamificationContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNetwork } from "@/context/NetworkContext";

const Index = () => {
  const location = useLocation();
  const [newBubbleDialog, setNewBubbleDialog] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { checkAchievement, addPoints, refreshGamificationProfile } = useGamification();
  const { isReconnecting } = useNetwork();
  
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
  } = useBubbleData();
  
  const searchParams = new URLSearchParams(location.search);
  const bubbleToOpen = searchParams.get('bubble');
  
  // Enhanced bubble creation with achievement tracking
  const handleCreateBubble = () => {
    setNewBubbleDialog(true);
  };
  
  // Enhanced reflection with gamification
  const handleReflectWithGamification = async (bubbleId: string) => {
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
        isBubbleExpired={selectedBubble ? isBubbleExpired(selectedBubble) : false}
        handleReflect={handleReflectWithGamification}
      />
      
      {/* Reconnection indicator */}
      {isReconnecting && (
        <ReconnectionIndicator isReconnecting={isReconnecting} />
      )}
    </div>
  );
};

export default Index;
