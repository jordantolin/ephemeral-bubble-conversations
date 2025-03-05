import React, { useRef, useEffect } from "react";
import { Clock, Plus, X, Trophy, Star, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import BubbleWorld from "@/components/BubbleWorld";
import { BubbleData } from "@/types/bubble";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useGamification } from "@/context/GamificationContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  // Add interaction instructions toast on first view
  useEffect(() => {
    if (!isLoadingBubbles && filteredBubbles.length > 0) {
      const hasShownInstructions = localStorage.getItem('bubble_instructions_shown');
      
      if (!hasShownInstructions) {
        setTimeout(() => {
          toast({
            title: "Tip: Interact with Bubbles",
            description: "Click and drag to rotate the bubble world. Scroll to zoom in/out.",
            duration: 5000,
          });
          localStorage.setItem('bubble_instructions_shown', 'true');
        }, 1500);
      }
    }
  }, [isLoadingBubbles, filteredBubbles.length]);

  // Gamification indicators - more subtle and mobile-friendly
  const renderGamificationStatus = () => {
    if (isLoadingGamification || !user) return null;
    
    return (
      <motion.div 
        className="absolute top-2 sm:top-4 right-2 sm:right-4 bg-white/90 backdrop-blur-sm rounded-full px-2 sm:px-3 py-1 sm:py-1.5 shadow-md z-10"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="flex items-center">
            <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-[#ebbd34] mr-0.5 sm:mr-1" />
            <span className="text-[10px] sm:text-xs font-medium text-gray-700">Lv.{profile.level}</span>
          </div>
          
          <div className="h-2 sm:h-3 w-px bg-gray-200 mx-0.5 sm:mx-1"></div>
          
          <div className="flex items-center">
            <Star className="h-3 w-3 sm:h-4 sm:w-4 text-[#ebbd34] mr-0.5 sm:mr-1" />
            <span className="text-[10px] sm:text-xs font-medium text-gray-700">{profile.points}</span>
          </div>
        </div>
      </motion.div>
    );
  };

  if (isLoadingBubbles) {
    return (
      <motion.div 
        className="text-center py-12 sm:py-16 bg-white/60 rounded-2xl backdrop-blur-sm shadow-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-t-4 border-[#ebbd34] mx-auto"></div>
        <p className="mt-4 text-[#ebbd34] text-lg sm:text-xl font-medium">Loading bubbles...</p>
        <p className="text-[#ebbd34]/60 mt-2 text-sm sm:text-base">Please wait while we gather the latest conversations</p>
      </motion.div>
    );
  }

  if (bubblesError) {
    return (
      <motion.div 
        className="text-center py-12 sm:py-16 px-4 bg-white/80 rounded-2xl backdrop-blur-sm shadow-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-4 bg-red-100">
          <X className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />
        </div>
        <h3 className="text-xl sm:text-2xl font-medium text-gray-800 mb-2">Error Loading Bubbles</h3>
        <p className="text-gray-600 mt-2 max-w-md mx-auto mb-6 text-sm sm:text-base">
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
      </motion.div>
    );
  }

  if (filteredBubbles.length === 0) {
    return (
      <motion.div 
        className="text-center py-12 sm:py-16 bg-white/60 rounded-2xl backdrop-blur-sm shadow-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mb-4 bg-[#ebbd34]/10">
          <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-[#ebbd34]" />
        </div>
        <h3 className="text-xl sm:text-2xl font-medium text-[#ebbd34] mb-2">No active bubbles found</h3>
        <p className="text-gray-600 max-w-md mx-auto mt-2 mb-6 text-sm sm:text-base px-4">
          Bubbles only last for 24 hours. Start a conversation by creating a new bubble!
        </p>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={onCreateBubble}
            className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white shadow-md px-4 sm:px-6 py-2.5 sm:py-3 text-base sm:text-lg"
            size="lg"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Bubble
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-[calc(100vh-180px)] sm:h-[calc(100vh-220px)] md:h-[550px] w-full max-w-xl mx-auto relative overflow-hidden touch-none bg-[#FEF7E4]"
    >
      {renderGamificationStatus()}
      
      {/* Instructions - more compact for mobile */}
      <motion.div 
        className="absolute bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 shadow-md z-10 text-[10px] sm:text-xs text-gray-600"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Info className="w-3 h-3 sm:w-4 sm:h-4 text-[#ebbd34]" />
          <span className="whitespace-nowrap">Drag to rotate • Scroll to zoom</span>
        </div>
      </motion.div>

      <BubbleWorld 
        topics={bubbleDataForComponent}
        onBubbleClick={onBubbleClick}
      />
    </div>
  );
};

export default BubbleWorldContent;
