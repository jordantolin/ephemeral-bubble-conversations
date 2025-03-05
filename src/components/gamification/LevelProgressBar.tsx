
import React from 'react';
import { Progress } from '@/components/ui/progress';

interface LevelProgressBarProps {
  points: number;
  level: number;
}

const LevelProgressBar: React.FC<LevelProgressBarProps> = ({ points, level }) => {
  // Calculate progress to next level
  const pointsForCurrentLevel = (level - 1) * 500;
  const pointsForNextLevel = level * 500;
  const pointsTowardsNextLevel = points - pointsForCurrentLevel;
  const maxPointsInLevel = pointsForNextLevel - pointsForCurrentLevel;
  const progressPercent = Math.min(100, (pointsTowardsNextLevel / maxPointsInLevel) * 100);
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">Level {level}</span>
        <span className="text-sm text-gray-500">
          {pointsTowardsNextLevel} / {maxPointsInLevel} points to Level {level + 1}
        </span>
      </div>
      <Progress 
        value={progressPercent} 
        className="h-2 bg-gray-100" 
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>Level {level}</span>
        <span>Level {level + 1}</span>
      </div>
    </div>
  );
};

export default LevelProgressBar;
