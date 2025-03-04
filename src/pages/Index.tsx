
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useBubbleData from "@/hooks/bubbles"; // Import from the new location
import NavigationBar from "@/components/bubbleWorld/NavigationBar";
import BubbleWorldHeader from "@/components/bubbleWorld/BubbleWorldHeader";
import BubbleWorldContent from "@/components/bubbleWorld/BubbleWorldContent";
import CreateBubbleDialog from "@/components/bubbleWorld/CreateBubbleDialog";
import BubbleChat from "@/components/bubbleWorld/BubbleChat";
import ReconnectionIndicator from "@/components/bubbleWorld/ReconnectionIndicator";

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [newBubbleDialog, setNewBubbleDialog] = useState(false);
  
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
  
  console.log("Index component received bubbles:", bubbleDataForComponent?.length);
  
  const searchParams = new URLSearchParams(location.search);
  const bubbleToOpen = searchParams.get('bubble');
  
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-secondary/20 overflow-x-hidden relative">
      {/* Reconnection indicator */}
      <ReconnectionIndicator isReconnecting={isReconnecting} />
      
      {/* Navigation */}
      <NavigationBar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      
      <div className="pt-28 pb-16 px-4 sm:px-6 relative z-10">
        {/* Bubble World and Filtering UI */}
        <div className="container mx-auto max-w-6xl">
          <BubbleWorldHeader onCreateBubble={() => setNewBubbleDialog(true)} />
          
          <BubbleWorldContent
            isLoadingBubbles={isLoadingBubbles}
            bubblesError={bubblesError}
            filteredBubbles={filteredBubbles}
            bubbleDataForComponent={bubbleDataForComponent}
            onBubbleClick={handleBubbleClick}
            onCreateBubble={() => setNewBubbleDialog(true)}
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
        isBubbleExpired={isBubbleExpired}
        handleReflect={handleReflect}
      />
    </div>
  );
};

export default Index;
