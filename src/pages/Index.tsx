import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useBubbleData from "@/hooks/useBubbleData";
import { useBubbleReflection } from "@/hooks/useBubbleReflection";
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
import { motion } from "framer-motion";

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [newBubbleDialog, setNewBubbleDialog] = useState(false);
  const { user } = useAuth();
  const { checkAchievement, addPoints } = useGamification();
  const { reflectOnBubble } = useBubbleReflection();
  
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
    handleBubbleClick
  } = useBubbleData();
  
  const searchParams = new URLSearchParams(location.search);
  const bubbleToOpen = searchParams.get('bubble');
  
  // Enhanced bubble creation with achievement tracking
  const handleCreateBubble = () => {
    setNewBubbleDialog(true);
  };
  
  // Enhanced reflection with improved reliability
  const handleReflectWithGamification = async (bubbleId: string) => {
    if (!selectedBubble) return;
    
    const success = await reflectOnBubble(bubbleId, selectedBubble.name);
    
    if (success && user) {
      // Already handled inside the reflectOnBubble hook
    }
  };
  
  // Check URL params for bubble to open
  useEffect(() => {
    if (bubbleToOpen) {
      setSelectedBubbleId(bubbleToOpen);
      setChatOpen(true);
    }
  }, [bubbleToOpen]);

  // Check for stored bubble ID (from profile page clicks)
  useEffect(() => {
    const storedBubbleId = localStorage.getItem('openBubbleId');
    if (storedBubbleId) {
      setSelectedBubbleId(storedBubbleId);
      setChatOpen(true);
      localStorage.removeItem('openBubbleId');
    }
  }, []);

  // Add custom styles for better spacing
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      body {
        background-color: #FEF7E4;
        overflow-x: hidden;
      }
      
      ::selection {
        background-color: rgba(235, 189, 52, 0.3);
        color: #000;
      }
      
      .bubble-world-container {
        transform-style: preserve-3d;
        perspective: 1000px;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Gentle entrance animation for main content
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        delay: 0.3,
        when: "beforeChildren",
        staggerChildren: 0.2
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-secondary/10 overflow-x-hidden relative">
      {/* Reconnection indicator */}
      <ReconnectionIndicator isReconnecting={isReconnecting} />
      
      {/* Achievement popup for gamification */}
      <AchievementPopup />
      
      {/* Navigation - Now at the top */}
      <NavigationBar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      
      <motion.div 
        className="pt-24 pb-8 px-4 sm:px-6 relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
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
      </motion.div>
      
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
        isBubbleExpired={isBubbleExpired}
        handleReflect={handleReflectWithGamification}
      />
      
      {/* Gamification Components */}
      <DailyStreakIndicator />
    </div>
  );
};

export default Index;
