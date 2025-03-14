
import React from "react";
import { motion } from "framer-motion";
import { useGamification } from "@/context/GamificationContext";
import { Progress } from "@/components/ui/progress";
import { Sparkles } from "lucide-react";

interface LevelProgressProps {
  minimal?: boolean;
}

const LevelProgress: React.FC<LevelProgressProps> = ({ minimal = false }) => {
  const { profile, isLoading } = useGamification();
  
  if (isLoading) {
    return (
      <div className={`flex items-center ${minimal ? 'gap-1' : 'gap-2'}`}>
        <div className="h-5 w-5 rounded-full bg-gray-200 animate-pulse"></div>
        <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }
  
  // Calculate points required for current level and next level
  const pointsForCurrentLevel = Math.pow(profile.level - 1, 2) * 100;
  const pointsForNextLevel = Math.pow(profile.level, 2) * 100;
  const pointsNeeded = pointsForNextLevel - pointsForCurrentLevel;
  const currentLevelPoints = profile.points - pointsForCurrentLevel;
  const progressPercentage = Math.min(Math.round((currentLevelPoints / pointsNeeded) * 100), 100);
  
  if (minimal) {
    return (
      <div className="flex items-center gap-1">
        <motion.div
          className="bg-[#ebbd34] rounded-full w-5 h-5 flex items-center justify-center text-white text-xs font-bold"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
        >
          {profile.level}
        </motion.div>
        <Progress value={progressPercentage} className="w-14 h-2 bg-[#ebbd34]/20" />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center">
          <motion.div
            className="bg-[#ebbd34] rounded-full w-6 h-6 flex items-center justify-center text-white text-xs font-bold mr-2"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
          >
            {profile.level}
          </motion.div>
          <span className="text-sm font-medium text-gray-700">Level {profile.level}</span>
        </div>
        <div className="flex items-center">
          <Sparkles className="h-4 w-4 text-[#ebbd34] mr-1" />
          <span className="text-xs font-medium text-[#ebbd34]">{profile.points} points</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Progress 
          value={progressPercentage} 
          className="h-2 bg-[#ebbd34]/20 flex-1" 
        />
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {currentLevelPoints}/{pointsNeeded}
        </span>
      </div>
    </div>
  );
};

export default LevelProgress;
