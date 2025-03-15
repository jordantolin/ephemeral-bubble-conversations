
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGamification } from "@/context/GamificationContext";
import { Award, Star, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const AchievementPopup: React.FC = () => {
  const { recentAchievement, resetRecentAchievement } = useGamification();
  const [visible, setVisible] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (recentAchievement) {
      setVisible(true);
      
      // Also show a toast to ensure the user sees the notification
      toast({
        title: "🏆 Achievement Unlocked!",
        description: recentAchievement.name,
        variant: "default",
        duration: 5000,
      });
      
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setVisible(false);
      }, 8000);
      
      return () => clearTimeout(timer);
    }
  }, [recentAchievement, toast]);

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
          className="fixed bottom-16 md:bottom-6 right-6 z-50 max-w-sm w-[calc(100%-2rem)] md:w-full"
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="bg-gradient-to-br from-yellow-100 to-amber-200 rounded-lg shadow-xl p-4 border border-[#ebbd34]/30 relative overflow-hidden">
            {/* Animated sparkles in background */}
            <div className="absolute -right-2 -top-2 opacity-30 animate-pulse">
              <Sparkles className="h-12 w-12 text-amber-500" />
            </div>
            
            <div className="flex items-start relative z-10">
              <div className="bg-gradient-to-br from-[#ebbd34] to-amber-500 rounded-full p-3 mr-4 flex-shrink-0 shadow-md">
                {recentAchievement.icon || <Award className="h-6 w-6 text-white" />}
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg text-amber-700">Achievement Unlocked!</h3>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 rounded-full hover:bg-amber-300/20" 
                    onClick={handleClose}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <h4 className="font-semibold text-gray-800 mt-1">{recentAchievement.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{recentAchievement.description}</p>
                
                <div className="mt-2 flex items-center">
                  <Star className="h-4 w-4 text-amber-500 mr-1" />
                  <span className="text-sm font-medium text-amber-600">
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
