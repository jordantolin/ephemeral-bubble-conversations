
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Award, Star, Zap, Flame } from "lucide-react";
import { GamificationProfile } from "@/utils/gamificationUtils";
import { formatDistanceToNow } from "date-fns";

interface AchievementsSectionProps {
  profile: GamificationProfile | null;
  loading?: boolean;
}

const AchievementsSection: React.FC<AchievementsSectionProps> = ({
  profile,
  loading = false
}) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[#ebbd34]" />
            <span>Achievements</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p>Loading achievements...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return null;
  }

  const achievements = profile.achievements || [];
  
  const getAchievementIcon = (name: string) => {
    if (name.includes('Streak') || name.includes('Warrior') || name.includes('Master')) {
      return <Flame className="h-5 w-5 text-red-500" />;
    }
    if (name.includes('Bubble')) {
      return <Zap className="h-5 w-5 text-blue-500" />;
    }
    if (name.includes('Reflection') || name.includes('Thinker')) {
      return <Award className="h-5 w-5 text-purple-500" />;
    }
    if (name.includes('Popular')) {
      return <Star className="h-5 w-5 text-amber-500" />;
    }
    return <Trophy className="h-5 w-5 text-[#ebbd34]" />;
  };

  return (
    <Card>
      <CardHeader className="bg-[#ebbd34]/10">
        <CardTitle className="flex items-center gap-2 text-[#ebbd34]">
          <Trophy className="h-5 w-5" />
          <span>Achievements</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {achievements.length === 0 ? (
          <div className="text-center py-6 bg-[#ebbd34]/5 rounded-lg">
            <Trophy className="h-8 w-8 text-[#ebbd34]/60 mx-auto mb-2" />
            <p className="text-gray-600">No achievements yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Create bubbles, make reflections, and log in daily to earn achievements!
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {achievements.map((achievement, index) => (
              <div 
                key={index} 
                className="flex items-start gap-3 p-3 bg-[#ebbd34]/5 rounded-lg"
              >
                <div className="mt-1">
                  {getAchievementIcon(achievement.name)}
                </div>
                <div>
                  <h4 className="font-medium">{achievement.name}</h4>
                  <p className="text-sm text-gray-600">{achievement.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Earned {formatDistanceToNow(new Date(achievement.awarded_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AchievementsSection;
