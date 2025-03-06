
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Award, Trophy, Zap, Flame } from "lucide-react";
import { GamificationProfile } from "@/utils/gamificationUtils";
import { cn } from "@/lib/utils";

interface GamificationCardProps {
  profile: GamificationProfile | null;
  progress: number;
  nextLevelPoints: number;
  className?: string;
}

const GamificationCard: React.FC<GamificationCardProps> = ({
  profile,
  progress,
  nextLevelPoints,
  className
}) => {
  if (!profile) return null;
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="bg-[#ebbd34]/10 pb-2">
        <CardTitle className="text-[#ebbd34] flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          <span>Your Achievements</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-4">
          {/* Level and XP */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-[#ebbd34] flex items-center justify-center text-white font-bold">
                {profile.level}
              </div>
              <div>
                <p className="text-sm font-medium">Level {profile.level}</p>
                <p className="text-xs text-gray-500">{profile.points} XP total</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">Next Level</p>
              <p className="text-xs text-gray-500">{nextLevelPoints - profile.points} XP needed</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <Progress 
              value={progress} 
              className="h-2 bg-[#ebbd34]/20" 
            />
            <p className="text-xs text-right text-gray-500">{Math.round(progress)}% to Level {profile.level + 1}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="bg-[#ebbd34]/5 rounded-lg p-2 text-center">
              <div className="flex justify-center mb-1">
                <Zap className="h-4 w-4 text-[#ebbd34]" />
              </div>
              <p className="text-lg font-semibold text-[#ebbd34]">{profile.bubble_points}</p>
              <p className="text-xs text-gray-600">Bubble Points</p>
            </div>
            <div className="bg-[#ebbd34]/5 rounded-lg p-2 text-center">
              <div className="flex justify-center mb-1">
                <Award className="h-4 w-4 text-[#ebbd34]" />
              </div>
              <p className="text-lg font-semibold text-[#ebbd34]">{profile.reflection_points}</p>
              <p className="text-xs text-gray-600">Reflection Points</p>
            </div>
            <div className="bg-[#ebbd34]/5 rounded-lg p-2 text-center">
              <div className="flex justify-center mb-1">
                <Flame className="h-4 w-4 text-[#ebbd34]" />
              </div>
              <p className="text-lg font-semibold text-[#ebbd34]">{profile.daily_streak}</p>
              <p className="text-xs text-gray-600">Day Streak</p>
            </div>
          </div>

          {/* Achievements */}
          {profile.achievements && profile.achievements.length > 0 ? (
            <div className="pt-2">
              <h4 className="text-sm font-medium mb-2">Recent Achievements</h4>
              <div className="space-y-2">
                {profile.achievements.slice(0, 3).map((achievement, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-[#ebbd34]/5 rounded-lg">
                    <Trophy className="h-4 w-4 text-[#ebbd34] flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{achievement.name}</p>
                      <p className="text-xs text-gray-500">{achievement.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="pt-2 text-center py-4 px-2 bg-[#ebbd34]/5 rounded-lg">
              <Trophy className="h-5 w-5 text-[#ebbd34] mx-auto mb-2" />
              <p className="text-sm text-gray-600">Complete actions to earn achievements!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GamificationCard;
