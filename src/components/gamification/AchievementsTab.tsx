
import React, { useState } from 'react';
import { useGamificationContext } from '@/context/GamificationContext';
import { Achievement, UserAchievement } from '@/hooks/useGamification';
import AchievementCard from './AchievementCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const AchievementsTab = () => {
  const [filter, setFilter] = useState('');
  const [category, setCategory] = useState('all');
  
  const { 
    userAchievements, 
    allAchievements, 
    isLoadingAchievements, 
    isLoadingAllAchievements 
  } = useGamificationContext();
  
  // Helper function to check if an achievement is unlocked
  const isAchievementUnlocked = (achievementId: string) => {
    return userAchievements.some(
      (userAchievement: UserAchievement) => 
        userAchievement.achievement_id === achievementId
    );
  };
  
  // Get date of when achievement was unlocked
  const getUnlockDate = (achievementId: string) => {
    const userAchievement = userAchievements.find(
      (ua: UserAchievement) => ua.achievement_id === achievementId
    );
    return userAchievement?.created_at;
  };

  // Filter achievements based on search input and category
  const filterAchievements = (achievements: Achievement[]) => {
    return achievements.filter((achievement: Achievement) => {
      const matchesSearch = 
        filter === '' || 
        achievement.name.toLowerCase().includes(filter.toLowerCase()) ||
        achievement.description.toLowerCase().includes(filter.toLowerCase());
      
      const matchesCategory = 
        category === 'all' || 
        achievement.category === category;
      
      return matchesSearch && matchesCategory;
    });
  };
  
  // Get all achievements we want to display
  const filteredAchievements = filterAchievements(allAchievements);
  
  // Get unlocked achievements for the "Unlocked" tab
  const unlockedAchievements = userAchievements
    .filter((ua: UserAchievement) => ua.achievement) // Filter out any that don't have matching achievements
    .filter((ua: UserAchievement) => {
      if (!ua.achievement) return false;
      
      const matchesSearch = 
        filter === '' || 
        ua.achievement.name.toLowerCase().includes(filter.toLowerCase()) ||
        ua.achievement.description.toLowerCase().includes(filter.toLowerCase());
      
      const matchesCategory = 
        category === 'all' || 
        ua.achievement.category === category;
      
      return matchesSearch && matchesCategory;
    });

  // Extract unique categories from achievements
  const categories = [
    'all',
    ...new Set(allAchievements.map((a: Achievement) => a.category))
  ];
  
  // Loading skeletons
  if (isLoadingAchievements || isLoadingAllAchievements) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-4 mb-4">
          <Skeleton className="h-10 w-[200px]" />
          <Skeleton className="h-10 w-full" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-[150px] w-full" />
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Search and filter controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search achievements..."
            className="pl-9"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        
        <div className="flex overflow-x-auto pb-1 gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
                category === cat
                  ? 'bg-[#ebbd34] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      {/* Tabs for All/Unlocked */}
      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Achievements</TabsTrigger>
          <TabsTrigger value="unlocked">
            Unlocked ({userAchievements.length}/{allAchievements.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-6">
          {filteredAchievements.length === 0 ? (
            <div className="text-center py-12">
              <Award className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No achievements found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filter ? 'Try a different search term' : 'There are no achievements in this category'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAchievements.map((achievement: Achievement) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  unlocked={isAchievementUnlocked(achievement.id)}
                  earnedDate={getUnlockDate(achievement.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="unlocked" className="space-y-6">
          {unlockedAchievements.length === 0 ? (
            <div className="text-center py-12">
              <Award className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No achievements unlocked yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filter 
                  ? 'Try a different search term' 
                  : 'Continue using the app to earn achievements'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unlockedAchievements.map((ua: UserAchievement) => (
                <AchievementCard
                  key={ua.id}
                  achievement={ua.achievement!}
                  unlocked={true}
                  earnedDate={ua.created_at}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AchievementsTab;
