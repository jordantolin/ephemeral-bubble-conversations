
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
import { AchievementId } from "@/types/gamification";

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
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
  
  const handleCreateBubble = () => {
    setNewBubbleDialog(true);
    
    // We'll check the achievement when the bubble is actually created
    // in the CreateBubbleDialog component
  };
  
  const handleReflectWithGamification = async (bubbleId: string) => {
    await handleReflect(bubbleId);
    
    if (user) {
      // Add points for the reflection
      await addPoints(10, 'reflection');
      
      // Increment progress for the reflection master achievement
      await incrementAchievementProgress('reflection-master' as AchievementId);
      
      // Refresh gamification profile to ensure all achievements are up to date
      await refreshGamificationProfile();
    }
  };
  
  const handleSendMessage = async () => {
    if (user) {
      // Add points for sending a message
      await addPoints(5, 'message');
      
      // Increment progress for the social butterfly achievement
      await incrementAchievementProgress('social-butterfly' as AchievementId);
    }
  };
  
  const incrementAchievementProgress = async (achievementId: AchievementId) => {
    await checkAchievement(achievementId);
  };
  
  useEffect(() => {
    if (bubbleToOpen) {
      setSelectedBubbleId(bubbleToOpen);
      setChatOpen(true);
    }
  }, [bubbleToOpen, setSelectedBubbleId, setChatOpen]);

  useEffect(() => {
    const storedBubbleId = localStorage.getItem('openBubbleId');
    if (storedBubbleId) {
      setSelectedBubbleId(storedBubbleId);
      setChatOpen(true);
      localStorage.removeItem('openBubbleId');
    }
  }, [setSelectedBubbleId, setChatOpen]);
  
  useEffect(() => {
    if (user) {
      refreshGamificationProfile();
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-secondary/20 overflow-x-hidden relative">
      <ReconnectionIndicator isReconnecting={isReconnecting} />
      
      <NavigationBar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      
      <div className="pt-24 md:pt-28 pb-20 md:pb-16 px-4 sm:px-6 relative z-10">
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
      
      <CreateBubbleDialog 
        open={newBubbleDialog} 
        onOpenChange={setNewBubbleDialog} 
      />
      
      <BubbleChat
        chatOpen={chatOpen}
        setChatOpen={setChatOpen}
        selectedBubbleId={selectedBubbleId}
        selectedBubble={selectedBubble}
        isLoadingBubbleDetails={isLoadingBubbleDetails}
        messages={messages}
        isLoadingMessages={isLoadingMessages}
        messagesError={messagesError}
        isBubbleExpired={isBubbleExpired}
        handleReflect={handleReflectWithGamification}
      />
      
      <DailyStreakIndicator />
      <AchievementPopup />
    </div>
  );
};

export default Index;
