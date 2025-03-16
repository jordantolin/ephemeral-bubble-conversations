
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X } from 'lucide-react';
import { useGamification } from '@/context/GamificationContext';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

const AchievementPopup: React.FC = () => {
  const { 
    lastUnlockedAchievement, 
    clearLastUnlockedAchievement 
  } = useGamification();
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    if (lastUnlockedAchievement) {
      setVisible(true);
      
      // Trigger confetti effect
      const end = Date.now() + 2000;
      const colors = ['#ebbd34', '#ffd166', '#ffb20f', '#ffdc7c'];
      
      const confettiEffect = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors
        });
        
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors
        });
  
        if (Date.now() < end) {
          requestAnimationFrame(confettiEffect);
        }
      };
      
      confettiEffect();
      
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setVisible(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [lastUnlockedAchievement]);
  
  // Handle close
  const handleClose = () => {
    setVisible(false);
    setTimeout(() => {
      clearLastUnlockedAchievement();
    }, 300); // Wait for exit animation
  };
  
  // After animation completes and popup is hidden, clear the achievement
  const handleAnimationComplete = () => {
    if (!visible) {
      clearLastUnlockedAchievement();
    }
  };
  
  return (
    <AnimatePresence>
      {visible && lastUnlockedAchievement && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          onAnimationComplete={handleAnimationComplete}
          className="fixed top-24 right-4 z-50 max-w-sm w-full"
        >
          <div className={cn(
            "p-4 rounded-lg shadow-lg bg-white border border-amber-200",
            "bg-gradient-to-r from-amber-50 to-white"
          )}>
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-amber-100 p-2 rounded-full mr-3">
                <Trophy className="h-6 w-6 text-amber-500" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Achievement Unlocked!
                    </p>
                    <h3 className="text-base font-bold text-amber-600 mt-1">
                      {lastUnlockedAchievement.name}
                    </h3>
                  </div>
                  
                  <button
                    onClick={handleClose}
                    className="flex-shrink-0 bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <p className="mt-1 text-sm text-gray-500">
                  {lastUnlockedAchievement.description}
                </p>
                
                <div className="mt-2 flex items-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                    +{lastUnlockedAchievement.points} Points
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
