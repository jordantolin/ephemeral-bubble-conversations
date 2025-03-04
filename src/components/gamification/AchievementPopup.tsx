
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGamification } from "@/context/GamificationContext";
import { Award, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const AchievementPopup: React.FC = () => {
  const { recentAchievement, resetRecentAchievement, getAchievementIcon } = useGamification();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (recentAchievement) {
      setVisible(true);
      
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setVisible(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [recentAchievement]);

  // Handle close
  const handleClose = () => {
    setVisible(false);
  };

  // Handle animation complete
  const handleAnimationComplete = () => {
    if (!visible) {
      resetRecentAchievement();
    }
  };

  if (!recentAchievement) return null;

  return (
    <AnimatePresence onExitComplete={handleAnimationComplete}>
      {visible && (
        <motion.div
          className="fixed bottom-4 right-4 z-50 max-w-sm w-full"
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="bg-gradient-to-br from-[#ebbd34]/20 to-[#ebbd34]/40 backdrop-blur-md rounded-lg shadow-lg p-4 border border-[#ebbd34]/30">
            <div className="flex items-start">
              <div className="bg-[#ebbd34] rounded-full p-3 mr-4">
                {getAchievementIcon(recentAchievement) || <Award className="h-6 w-6 text-white" />}
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg text-[#ebbd34]">Achievement Unlocked!</h3>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 rounded-full" 
                    onClick={handleClose}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <h4 className="font-semibold text-gray-800 mt-1">{recentAchievement.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{recentAchievement.description}</p>
                
                <div className="mt-2 flex items-center">
                  <Star className="h-4 w-4 text-[#ebbd34] mr-1" />
                  <span className="text-sm font-medium text-[#ebbd34]">
                    +{recentAchievement.points} points
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AchievementPopup;
