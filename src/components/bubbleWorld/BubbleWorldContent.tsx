
import React from "react";
import { Clock, Plus, X, Trophy, Star, Award, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import BubbleWorld from "@/components/BubbleWorld";
import { BubbleData } from "@/types/bubble";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useGamification } from "@/context/GamificationContext";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";

interface BubbleWorldContentProps {
  isLoadingBubbles: boolean;
  bubblesError: any;
  filteredBubbles: any[];
  bubbleDataForComponent: BubbleData[];
  onBubbleClick: (bubbleId: string) => void;
  onCreateBubble: () => void;
  isReconnecting?: boolean;
}

const BubbleWorldContent: React.FC<BubbleWorldContentProps> = ({
  isLoadingBubbles,
  bubblesError,
  filteredBubbles,
  bubbleDataForComponent,
  onBubbleClick,
  onCreateBubble,
  isReconnecting = false
}) => {
  const queryClient = useQueryClient();
  const { profile, isLoading: isLoadingGamification } = useGamification();
  const { user } = useAuth();

  // Gamification indicators
  const renderGamificationStatus = () => {
    if (isLoadingGamification || !user) return null;
    
    return (
      <motion.div 
        className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md border border-[#ebbd34]/30"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center">
            <Trophy className="h-4 w-4 text-[#ebbd34] mr-1" />
            <span className="text-xs font-medium text-gray-700">Level {profile.level}</span>
          </div>
          
          <div className="flex items-center">
            <Star className="h-4 w-4 text-[#ebbd34] mr-1" />
            <span className="text-xs font-medium text-gray-700">{profile.points} pts</span>
          </div>
          
          <Link to="/achievements">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2 text-[#ebbd34] hover:bg-[#ebbd34]/10"
            >
              <Award className="h-3 w-3 mr-1" />
              Achievements
            </Button>
          </Link>
        </div>
      </motion.div>
    );
  };

  // Connection status indicator
  const renderConnectionStatus = () => {
    if (!isReconnecting) return null;
    
    return (
      <motion.div 
        className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md border border-red-200 z-20"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
      >
        <div className="flex items-center text-red-500">
          <WifiOff className="h-4 w-4 mr-1" />
          <span className="text-xs font-medium">Reconnecting...</span>
        </div>
      </motion.div>
    );
  };

  // Loading state with improved animation and messaging
  if (isLoadingBubbles) {
    return (
      <div className="text-center py-16 md:py-24 bg-white/50 rounded-xl backdrop-blur-sm shadow-md relative h-[70vh] flex flex-col justify-center items-center">
        {renderConnectionStatus()}
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 md:h-16 md:w-16 border-4 border-t-4 border-[#ebbd34] mx-auto"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-6 w-6 md:h-8 md:w-8 bg-white/80 rounded-full"></div>
          </div>
        </div>
        <motion.p 
          className="mt-6 text-[#ebbd34] text-lg md:text-xl font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Loading bubbles...
        </motion.p>
        <motion.p 
          className="text-[#ebbd34]/60 mt-2 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Please wait while we gather the latest conversations
        </motion.p>
      </div>
    );
  }

  // Enhanced error state with retry functionality
  if (bubblesError) {
    return (
      <div className="text-center py-16 md:py-24 px-4 bg-white/60 rounded-xl backdrop-blur-sm shadow-md relative h-[70vh] flex flex-col justify-center items-center">
        {renderConnectionStatus()}
        <motion.div 
          className="mx-auto w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-4 bg-red-100"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <X className="w-8 h-8 md:w-10 md:h-10 text-red-500" />
        </motion.div>
        <motion.h3 
          className="text-xl md:text-2xl font-medium text-gray-800 mb-2"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Error Loading Bubbles
        </motion.h3>
        <motion.p 
          className="text-gray-600 mt-2 max-w-md mx-auto mb-6"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          There was a problem loading the bubbles. Please check your connection and try again.
        </motion.p>
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['bubbles'] })}
            variant="outline"
            size="lg"
            className="border-[#ebbd34]/30 text-[#ebbd34] hover:bg-[#ebbd34]/10"
          >
            <Wifi className="mr-2 h-5 w-5" />
            Retry Connection
          </Button>
        </motion.div>
      </div>
    );
  }

  // No bubbles found state
  if (!filteredBubbles || filteredBubbles.length === 0) {
    return (
      <div className="text-center py-16 md:py-24 bg-white/50 rounded-xl backdrop-blur-sm shadow-md relative h-[70vh] flex flex-col justify-center items-center">
        {renderConnectionStatus()}
        <motion.div 
          className="mx-auto w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-6 bg-[#ebbd34]/10"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Clock className="w-8 h-8 md:w-10 md:h-10 text-[#ebbd34]" />
        </motion.div>
        <motion.h3 
          className="text-xl md:text-2xl font-medium text-[#ebbd34] mb-3"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          No active bubbles found
        </motion.h3>
        <motion.p 
          className="text-gray-600 max-w-md mx-auto mt-2 mb-8 px-4"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Bubbles only last for 24 hours. Start a conversation by creating a new bubble!
        </motion.p>
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={onCreateBubble}
            className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white shadow-md px-6 py-5 md:px-8 md:py-6 text-base md:text-lg"
            size="lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Create Your First Bubble
          </Button>
        </motion.div>
      </div>
    );
  }

  // Ensure we're actually getting valid bubble data
  if (!Array.isArray(bubbleDataForComponent) || bubbleDataForComponent.length === 0) {
    return (
      <div className="h-[70vh] md:h-[75vh] min-h-[400px] md:min-h-[500px] w-full bg-white/50 rounded-2xl backdrop-blur-sm p-3 shadow-lg border border-[#ebbd34]/20 relative">
        {renderConnectionStatus()}
        {renderGamificationStatus()}
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-[#ebbd34] font-medium mb-4">No bubbles available right now</p>
            <Button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['bubbles'] })}
              className="mb-4 border-[#ebbd34]/30 text-[#ebbd34] hover:bg-[#ebbd34]/10"
              variant="outline"
            >
              <Wifi className="mr-2 h-4 w-4" />
              Refresh Data
            </Button>
            <Button
              onClick={onCreateBubble}
              className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white mt-2"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create a Bubble
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Normal state with bubbles
  return (
    <div className="h-[70vh] md:h-[75vh] min-h-[400px] md:min-h-[500px] w-full bg-white/50 rounded-2xl backdrop-blur-sm p-3 shadow-lg border border-[#ebbd34]/20 relative">
      {renderConnectionStatus()}
      {renderGamificationStatus()}
      <AnimatePresence>
        <motion.div 
          className="w-full h-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          key="bubble-world"
        >
          <BubbleWorld 
            topics={bubbleDataForComponent}
            onBubbleClick={onBubbleClick}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default BubbleWorldContent;
