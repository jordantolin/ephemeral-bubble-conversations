
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

  // Return a minimal loading state that still shows some UI
  if (isLoading || !profile) {
    return minimal ? (
      <div className="flex items-center gap-1">
        <div className="bg-yellow-400 rounded-full w-5 h-5 flex items-center justify-center">
          <span className="text-white text-xs">?</span>
        </div>
        <Progress value={30} className="w-14 h-2 bg-yellow-100" />
      </div>
    ) : (
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center">
            <div className="bg-yellow-400 rounded-full w-6 h-6 flex items-center justify-center mr-2">
              <span className="text-white text-xs">?</span>
            </div>
            <span className="text-sm font-medium text-gray-700">Loading...</span>
          </div>
        </div>
        <Progress value={30} className="h-2 bg-yellow-100 w-full" />
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
          className="bg-yellow-400 rounded-full w-5 h-5 flex items-center justify-center text-white text-xs font-bold"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
        >
          {profile.level}
        </motion.div>
        <Progress value={progressPercentage} className="w-14 h-2 bg-yellow-100" />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center">
          <motion.div
            className="bg-yellow-400 rounded-full w-6 h-6 flex items-center justify-center text-white text-xs font-bold mr-2"
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
          <Sparkles className="h-4 w-4 text-yellow-400 mr-1" />
          <span className="text-xs font-medium text-yellow-500">{profile.points} points</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Progress 
          value={progressPercentage} 
          className="h-2 bg-yellow-100 flex-1" 
        />
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {currentLevelPoints}/{pointsNeeded}
        </span>
      </div>
    </div>
  );
};

export default LevelProgress;
