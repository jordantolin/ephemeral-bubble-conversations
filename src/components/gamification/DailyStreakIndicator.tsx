
import React from "react";
import { motion } from "framer-motion";
import { useGamification } from "@/context/GamificationContext";
import { Flame, Gift, Star } from "lucide-react";

const DailyStreakIndicator: React.FC = () => {
  const { profile, isLoading } = useGamification();
  
  if (isLoading || profile.dailyStreak < 2) return null;
  
  const streakDays = Math.min(profile.dailyStreak, 7);
  
  return (
    <motion.div
      className="fixed bottom-16 md:bottom-4 left-4 z-40 bg-white/90 backdrop-blur-md rounded-lg shadow-md border border-[#ebbd34]/30 p-3 max-w-[220px]"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center mb-2">
        <Flame className="h-5 w-5 text-[#ebbd34] mr-2" />
        <span className="font-medium text-[#ebbd34]">{profile.dailyStreak} Day Streak!</span>
      </div>
      
      <div className="flex space-x-1 mb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className={`h-2 w-6 rounded-full transition-all duration-200 ${
              i < streakDays 
                ? 'bg-[#ebbd34]' 
                : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      
      <div className="text-xs text-gray-600">
        Come back tomorrow for +{10 + (profile.dailyStreak * 5)} points!
      </div>
      
      {profile.dailyStreak % 5 === 0 && (
        <motion.div
          className="mt-2 pt-2 border-t border-[#ebbd34]/20 flex items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <Gift className="h-4 w-4 text-[#ebbd34] mr-1" />
          <span className="text-xs font-medium text-gray-700">Streak Bonus!</span>
          <div className="ml-auto flex items-center">
            <Star className="h-3 w-3 text-[#ebbd34] mr-1" />
            <span className="text-xs font-medium text-[#ebbd34]">+{profile.dailyStreak * 10} pts</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default DailyStreakIndicator;
