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
import { useGamification } from "@/context/GamificationContext";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { ErrorBoundary } from "react-error-boundary";

const FallbackComponent = ({ error }) => (
  <div className="p-4 m-4 bg-red-100 border border-red-400 text-red-700 rounded">
    <h2 className="text-xl font-bold mb-2">Something went wrong:</h2>
    <p>{error.message || "Unknown error occurred"}</p>
  </div>
);

const IndexContent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [newBubbleDialog, setNewBubbleDialog] = useState(false);
  const { user } = useAuth();
  const { checkAchievement, addPoints } = useGamification();
  
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
    setNewBubbleDialog(true);
  };
  
  // Enhanced reflection with gamification
  const handleReflectWithGamification = async (bubbleId: string) => {
    await handleReflect(bubbleId);
    
    if (user) {
      // Add points for the reflection
      await addPoints(10, 'reflection');
      
      // Increment progress for the reflection master achievement
      await checkAchievement('reflection-master');
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
    <div className="min-h-screen bg-gradient-to-br from-white to-secondary/20 overflow-x-hidden relative">
      {/* Reconnection indicator */}
      <ReconnectionIndicator isReconnecting={isReconnecting} />
      
      {/* Navigation */}
      <NavigationBar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      
      <motion.div 
        className="pt-24 sm:pt-28 pb-16 px-4 sm:px-6 relative z-10"
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
            filteredBubbles={filteredBubbles || []}
            bubbleDataForComponent={bubbleDataForComponent || []}
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
        messages={messages || []}
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

const Index = () => {
  return (
    <ErrorBoundary FallbackComponent={FallbackComponent}>
      <IndexContent />
    </ErrorBoundary>
  );
};

export default Index;
