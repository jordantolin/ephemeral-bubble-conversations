
import React from "react";
import { Clock, Plus, X, Trophy, Star, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import BubbleWorld from "@/components/BubbleWorld";
import { BubbleData } from "@/types/bubble";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useGamification } from "@/context/GamificationContext";
import { useAuth } from "@/context/AuthContext";

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

  // Gamification indicators - more subtle now
  const renderGamificationStatus = () => {
    if (isLoadingGamification || !user) return null;
    
    return (
      <motion.div 
        className="absolute top-4 right-4 bg-white/70 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <Trophy className="h-3.5 w-3.5 text-[#ebbd34] mr-1" />
            <span className="text-xs font-medium text-gray-700">Lv.{profile.level}</span>
          </div>
          
          <div className="h-3 w-px bg-gray-200 mx-1"></div>
          
          <div className="flex items-center">
            <Star className="h-3.5 w-3.5 text-[#ebbd34] mr-1" />
            <span className="text-xs font-medium text-gray-700">{profile.points}</span>
          </div>
        </div>
      </motion.div>
    );
  };

  if (isLoadingBubbles) {
    return (
      <div className="text-center py-24 bg-white/30 rounded-xl backdrop-blur-sm shadow-sm">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-4 border-[#ebbd34] mx-auto"></div>
        <p className="mt-6 text-[#ebbd34] text-xl font-medium">Loading bubbles...</p>
        <p className="text-[#ebbd34]/60 mt-2">Please wait while we gather the latest conversations</p>
      </div>
    );
  }

  if (bubblesError) {
    return (
      <div className="text-center py-24 px-4 bg-white/60 rounded-xl backdrop-blur-sm shadow-sm">
        <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4 bg-red-100">
          <X className="w-10 h-10 text-red-500" />
        </div>
        <h3 className="text-2xl font-medium text-gray-800 mb-2">Error Loading Bubbles</h3>
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

  if (filteredBubbles.length === 0) {
    return (
      <div className="text-center py-24 bg-white/40 rounded-xl backdrop-blur-sm shadow-sm">
        <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-[#ebbd34]/10">
          <Clock className="w-10 h-10 text-[#ebbd34]" />
        </div>
        <h3 className="text-2xl font-medium text-[#ebbd34] mb-3">No active bubbles found</h3>
        <p className="text-gray-600 max-w-md mx-auto mt-2 mb-8">
          Bubbles only last for 24 hours. Start a conversation by creating a new bubble!
        </p>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={onCreateBubble}
            className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white shadow-md px-8 py-6 text-lg"
            size="lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Create Your First Bubble
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-[75vh] min-h-[500px] w-full bg-white/30 rounded-2xl backdrop-blur-sm p-3 shadow-lg border border-[#ebbd34]/10 relative">
      {renderGamificationStatus()}
      <BubbleWorld 
        topics={bubbleDataForComponent}
        onBubbleClick={onBubbleClick}
      />
    </div>
  );
};

export default BubbleWorldContent;
