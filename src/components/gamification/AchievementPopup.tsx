
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGamification } from "@/context/GamificationContext";
import { Award, Star, X, Sparkles, Trophy, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import ComponentErrorBoundary from "../errorHandling/ComponentErrorBoundary";

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
      
      // Auto-hide after 8 seconds
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

  // Helper to get appropriate icon
  const getAchievementIcon = () => {
    if (!recentAchievement.icon) {
      if (recentAchievement.id.includes('bubble')) return <Gift className="h-6 w-6 text-white" />;
      if (recentAchievement.id.includes('social')) return <Star className="h-6 w-6 text-white" />;
      if (recentAchievement.id.includes('streak')) return <Trophy className="h-6 w-6 text-white" />;
      if (recentAchievement.id.includes('reflection')) return <Award className="h-6 w-6 text-white" />;
      if (recentAchievement.id.includes('popular')) return <Trophy className="h-6 w-6 text-white" />;
      return <Award className="h-6 w-6 text-white" />;
    }
    return recentAchievement.icon;
  };

  return (
    <ComponentErrorBoundary name="Achievement Popup">
      <AnimatePresence onExitComplete={handleAnimationComplete}>
        {visible && (
          <motion.div
            className="fixed bottom-16 md:bottom-6 right-6 z-50 max-w-sm w-[calc(100%-2rem)] md:w-full"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/40 rounded-lg shadow-xl p-5 border border-[#ebbd34]/30 relative overflow-hidden backdrop-blur-sm">
              {/* Animated sparkles in background */}
              <div className="absolute -right-2 -top-2 opacity-30 animate-pulse">
                <Sparkles className="h-14 w-14 text-amber-500" />
              </div>
              <div className="absolute -left-2 -bottom-2 opacity-20 animate-pulse">
                <Sparkles className="h-10 w-10 text-amber-400" />
              </div>
              
              <div className="flex items-start relative z-10">
                <div className="bg-gradient-to-br from-[#ebbd34] to-amber-500 rounded-full p-3 mr-4 flex-shrink-0 shadow-lg ring-2 ring-amber-200 dark:ring-amber-700">
                  {getAchievementIcon()}
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg text-amber-700 dark:text-amber-300">Achievement Unlocked!</h3>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 rounded-full hover:bg-amber-300/20" 
                      onClick={handleClose}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <h4 className="font-semibold text-gray-800 dark:text-amber-100 mt-1">{recentAchievement.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-amber-200/80 mt-1">{recentAchievement.description}</p>
                  
                  {recentAchievement.progress !== undefined && recentAchievement.maxProgress !== undefined && (
                    <div className="mt-2">
                      <Progress 
                        value={100} 
                        className="h-1.5 bg-amber-100/50 dark:bg-amber-900/50"
                      />
                    </div>
                  )}
                  
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-amber-500 mr-1" />
                      <span className="text-sm font-medium text-amber-600 dark:text-amber-300">
                        +{recentAchievement.points} points
                      </span>
                    </div>
                    
                    <Link to="/achievements">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-100/50 dark:text-amber-300 dark:hover:bg-amber-800/50"
                      >
                        View All
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
              
              {/* Particle effects */}
              <motion.div 
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {Array.from({ length: 10 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full bg-amber-400/30"
                    initial={{ 
                      x: '50%', 
                      y: '60%',
                      scale: 0 
                    }}
                    animate={{ 
                      x: `${Math.random() * 100}%`, 
                      y: `${Math.random() * 100}%`,
                      scale: Math.random() * 1.5
                    }}
                    transition={{ 
                      duration: 2 + Math.random() * 2,
                      delay: Math.random(),
                      repeat: Infinity,
                      repeatType: 'reverse'
                    }}
                  />
                ))}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ComponentErrorBoundary>
  );
};

export default AchievementPopup;
