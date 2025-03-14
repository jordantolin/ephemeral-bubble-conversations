
import React from "react";
import { Clock, Plus, X, Trophy, Star, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import BubbleWorld from "@/components/BubbleWorld";
import { BubbleData } from "@/types/bubble";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
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
}

const BubbleWorldContent: React.FC<BubbleWorldContentProps> = ({
  isLoadingBubbles,
  bubblesError,
  filteredBubbles,
  bubbleDataForComponent,
  onBubbleClick,
  onCreateBubble,
}) => {
  const queryClient = useQueryClient();
  const { profile, isLoading: isLoadingGamification } = useGamification();
  const { user } = useAuth();

  // Gamification indicators
  const renderGamificationStatus = () => {
    if (isLoadingGamification || !user) return null;
    
    return (
      <motion.div 
        className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-[#ebbd34]/20"
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

  // Loading state with improved animation and messaging
  if (isLoadingBubbles) {
    return (
      <div className="text-center py-16 md:py-24 bg-white/30 rounded-xl backdrop-blur-sm shadow-sm">
        <div className="animate-spin rounded-full h-12 w-12 md:h-16 md:w-16 border-4 border-t-4 border-[#ebbd34] mx-auto"></div>
        <p className="mt-6 text-[#ebbd34] text-lg md:text-xl font-medium">Loading bubbles...</p>
        <p className="text-[#ebbd34]/60 mt-2 px-4">Please wait while we gather the latest conversations</p>
      </div>
    );
  }

  // Enhanced error state with retry functionality
  if (bubblesError) {
    return (
      <div className="text-center py-16 md:py-24 px-4 bg-white/60 rounded-xl backdrop-blur-sm shadow-sm">
        <div className="mx-auto w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-4 bg-red-100">
          <X className="w-8 h-8 md:w-10 md:h-10 text-red-500" />
        </div>
        <h3 className="text-xl md:text-2xl font-medium text-gray-800 mb-2">Error Loading Bubbles</h3>
        <p className="text-gray-600 mt-2 max-w-md mx-auto mb-6">
          There was a problem loading the bubbles. Please check your connection and try again.
        </p>
        <Button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['bubbles'] })}
          variant="outline"
          size="lg"
          className="border-[#ebbd34]/30 text-[#ebbd34] hover:bg-[#ebbd34]/10"
        >
          Retry
        </Button>
      </div>
    );
  }

  // No bubbles found state
  if (filteredBubbles.length === 0) {
    return (
      <div className="text-center py-16 md:py-24 bg-white/40 rounded-xl backdrop-blur-sm shadow-sm">
        <div className="mx-auto w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-6 bg-[#ebbd34]/10">
          <Clock className="w-8 h-8 md:w-10 md:h-10 text-[#ebbd34]" />
        </div>
        <h3 className="text-xl md:text-2xl font-medium text-[#ebbd34] mb-3">No active bubbles found</h3>
        <p className="text-gray-600 max-w-md mx-auto mt-2 mb-8 px-4">
          Bubbles only last for 24 hours. Start a conversation by creating a new bubble!
        </p>
        <motion.div
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

  // Normal state with bubbles
  return (
    <div className="h-[70vh] md:h-[75vh] min-h-[400px] md:min-h-[500px] w-full bg-white/30 rounded-2xl backdrop-blur-sm p-3 shadow-lg border border-[#ebbd34]/10 relative">
      {renderGamificationStatus()}
      <BubbleWorld 
        topics={bubbleDataForComponent}
        onBubbleClick={onBubbleClick}
      />
    </div>
  );
};

export default BubbleWorldContent;
