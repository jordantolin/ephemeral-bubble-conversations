
import React from 'react';
import { Award, Gift, Trophy, Star, MessageCircle, Heart, Compass, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Achievement } from '@/hooks/useGamification';

interface AchievementCardProps {
  achievement: Achievement;
  unlocked?: boolean;
  earnedDate?: string;
}

const AchievementCard: React.FC<AchievementCardProps> = ({ 
  achievement, 
  unlocked = false,
  earnedDate
}) => {
  // Icon map based on icon_type field
  const getIcon = (iconType: string) => {
    const IconProps = { className: "h-6 w-6" };
    
    switch (iconType) {
      case 'award': return <Award {...IconProps} />;
      case 'gift': return <Gift {...IconProps} />;
      case 'trophy': return <Trophy {...IconProps} />;
      case 'star': return <Star {...IconProps} />;
      case 'message-circle': return <MessageCircle {...IconProps} />;
      case 'heart': return <Heart {...IconProps} />;
      case 'compass': return <Compass {...IconProps} />;
      case 'sparkles': return <Sparkles {...IconProps} />;
      default: return <Award {...IconProps} />;
    }
  };
  
  // Format date to a readable format
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(date);
    } catch (error) {
      return 'Unknown date';
    }
  };

  return (
    <Card className={`overflow-hidden transition-all ${
      unlocked 
        ? 'border-[#ebbd34]/30 bg-white' 
        : 'border-gray-200 bg-gray-50/50 opacity-70'
    }`}>
      <CardHeader className="p-4 pb-2 flex flex-row items-center gap-3">
        <div className={`rounded-full p-2 ${
          unlocked 
            ? 'bg-[#ebbd34]/10 text-[#ebbd34]' 
            : 'bg-gray-100 text-gray-400'
        }`}>
          {getIcon(achievement.icon_type)}
        </div>
        <div className="flex-1">
          <h3 className={`font-semibold ${unlocked ? 'text-gray-800' : 'text-gray-500'}`}>
            {achievement.name}
          </h3>
          <p className={`text-xs ${unlocked ? 'text-gray-600' : 'text-gray-400'}`}>
            {unlocked && earnedDate 
              ? `Earned on ${formatDate(earnedDate)}` 
              : achievement.category.charAt(0).toUpperCase() + achievement.category.slice(1)}
          </p>
        </div>
        <div className={`text-right ${unlocked ? 'text-[#ebbd34]' : 'text-gray-400'}`}>
          <span className="font-bold">+{achievement.points}</span>
          <p className="text-xs">points</p>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className={`text-sm ${unlocked ? 'text-gray-600' : 'text-gray-400'}`}>
          {achievement.description}
        </p>
      </CardContent>
    </Card>
  );
};

export default AchievementCard;
