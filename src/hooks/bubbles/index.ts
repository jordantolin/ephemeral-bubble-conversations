
import { useState } from "react";
import useBubbleFetch from "./useBubbleFetch";
import useRealtime from "./useRealtime";
import useBubbleInteractions from "./useBubbleInteractions";
import useBubbleFiltering from "./useBubbleFiltering";
import useBubbleExpiryCheck from "./useBubbleExpiryCheck";
import { useBubbleUtils } from "./useBubbleUtils";

/**
 * Main hook combining all bubble-related functionality
 */
const useBubbleData = () => {
  // State for UI interactions
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Import sub-hooks
  const { 
    allBubbles, 
    isLoadingBubbles, 
    bubblesError, 
    fetchBubbleById, 
    fetchBubbleMessages
  } = useBubbleFetch();
  
  const { isReconnecting } = useRealtime(selectedBubbleId);
  
  const { handleReflect, handleBubbleClick } = useBubbleInteractions();
  
  const { isBubbleExpired, shouldShowInFeed } = useBubbleUtils();
  
  const { explodingBubbleId } = useBubbleExpiryCheck(allBubbles);
  
  const { 
    filteredBubbles, 
    topBubblesByReflections, 
    bubbleDataForComponent 
  } = useBubbleFiltering(allBubbles, searchQuery, explodingBubbleId);
  
  // Fetch selected bubble details if a bubble is selected
  const { 
    data: selectedBubble, 
    isLoading: isLoadingBubbleDetails, 
    error: bubbleDetailsError 
  } = fetchBubbleById(selectedBubbleId);
  
  // Fetch messages for selected bubble if chat is open
  const { 
    data: messages = [], 
    isLoading: isLoadingMessages, 
    error: messagesError 
  } = fetchBubbleMessages(selectedBubbleId, chatOpen);

  return {
    // Bubble data
    bubbles: allBubbles,
    filteredBubbles,
    topBubblesByReflections,
    isLoadingBubbles,
    bubblesError,
    
    // Search functionality
    searchQuery,
    setSearchQuery,
    
    // Selected bubble and chat
    selectedBubbleId,
    setSelectedBubbleId,
    selectedBubble,
    isLoadingBubbleDetails,
    bubbleDetailsError,
    messages,
    isLoadingMessages,
    messagesError,
    chatOpen,
    setChatOpen,
    
    // Status
    isReconnecting,
    explodingBubbleId,
    
    // Data for component
    bubbleDataForComponent,
    
    // Utility functions
    isBubbleExpired,
    shouldShowInFeed,
    
    // Interaction handlers - binding the bubbles array to the handlers
    handleReflect: (bubbleId: string) => handleReflect(bubbleId, allBubbles),
    handleBubbleClick: (bubbleId: string) => handleBubbleClick(bubbleId, allBubbles)
  };
};

export default useBubbleData;
