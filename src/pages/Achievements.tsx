
import React, { useState, useEffect } from 'react';
import { useGamification } from '@/context/GamificationContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Star, Clock, Lock, Award, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import LevelProgress from '@/components/gamification/LevelProgress';

const Achievements: React.FC = () => {
  const { 
    achievements, 
    unlockedAchievements, 
    gamificationProfile, 
    isLoadingProfile,
    isLoadingAchievements
  } = useGamification();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [animatedEntries, setAnimatedEntries] = useState<Record<string, boolean>>({});

  // Setup animation entries
  useEffect(() => {
    if (achievements.length > 0 && !isLoadingAchievements) {
      // Stagger the animations for a nicer effect
      const timeout = setTimeout(() => {
        const entries: Record<string, boolean> = {};
        achievements.forEach((achievement, index) => {
          setTimeout(() => {
            setAnimatedEntries(prev => ({
              ...prev,
              [achievement.id]: true
            }));
          }, index * 100);
        });
      }, 300);
      
      return () => clearTimeout(timeout);
    }
  }, [achievements, isLoadingAchievements]);

  // Filter achievements based on active tab
  const filteredAchievements = achievements.filter(achievement => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unlocked') return unlockedAchievements.includes(achievement.id);
    if (activeTab === 'locked') return !unlockedAchievements.includes(achievement.id);
    return true;
  });

  // Get achievement progress for a specific achievement
  const getAchievementProgress = (achievementId: string): number => {
    if (unlockedAchievements.includes(achievementId)) return 100;
    
    const achievement = achievements.find(a => a.id === achievementId);
    if (!achievement || !achievement.threshold) return 0;
    
    const progressTracking = gamificationProfile?.achievement_progress || {};
    const current = progressTracking[achievementId] || 0;
    return Math.min(Math.floor((current / achievement.threshold) * 100), 99);
  };

  if (isLoadingProfile || isLoadingAchievements) {
    return (
      <div className="container mx-auto max-w-4xl py-8 pt-24 px-4">
        <div className="text-center mb-8">
          <Skeleton className="h-8 w-64 mx-auto mb-2" />
          <Skeleton className="h-4 w-96 mx-auto" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FEF7E4]">
      <div className="container mx-auto max-w-4xl py-8 pt-24 pb-16 px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#333]">Your Achievements</h1>
          <p className="text-gray-600 mt-2">Track your progress and unlock rewards</p>
          
          <div className="mt-6 mb-8 max-w-xs mx-auto">
            <LevelProgress />
          </div>
        </div>
        
        <Tabs defaultValue="all" className="mb-6" onValueChange={setActiveTab}>
          <div className="flex justify-center mb-6">
            <TabsList className="bg-white/50 backdrop-blur-sm">
              <TabsTrigger value="all" className="data-[state=active]:bg-[#ebbd34] data-[state=active]:text-white">
                All
              </TabsTrigger>
              <TabsTrigger value="unlocked" className="data-[state=active]:bg-[#ebbd34] data-[state=active]:text-white">
                Unlocked
              </TabsTrigger>
              <TabsTrigger value="locked" className="data-[state=active]:bg-[#ebbd34] data-[state=active]:text-white">
                Locked
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="all" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredAchievements.map((achievement) => {
                const isUnlocked = unlockedAchievements.includes(achievement.id);
                const progress = getAchievementProgress(achievement.id);
                
                return (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={animatedEntries[achievement.id] ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className={`overflow-hidden border ${isUnlocked ? 'border-amber-200 bg-white/80' : 'border-gray-200 bg-white/50'} backdrop-blur-sm transition-all duration-300 hover:shadow-md`}>
                      <CardHeader className="relative pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg font-bold text-[#333]">
                            {achievement.name}
                          </CardTitle>
                          
                          {isUnlocked ? (
                            <Badge className="bg-[#ebbd34] text-white">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Unlocked
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500 border-gray-300">
                              <Lock className="h-3 w-3 mr-1" />
                              Locked
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="flex items-center mb-3">
                          <div className={`rounded-full p-3 mr-3 ${isUnlocked ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
                            {achievement.category === 'daily' ? (
                              <Clock className="h-5 w-5" />
                            ) : achievement.category === 'social' ? (
                              <Star className="h-5 w-5" />
                            ) : (
                              <Trophy className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">{achievement.description}</p>
                            
                            {!isUnlocked && achievement.threshold && (
                              <div className="mt-2">
                                <Progress 
                                  value={progress} 
                                  className="h-2 bg-gray-100" 
                                  indicatorClassName={isUnlocked ? "bg-green-400" : "bg-[#ebbd34]"} 
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  {progress}% Complete
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                      
                      <CardFooter className="pt-0 pb-4">
                        <div className="w-full flex justify-between items-center">
                          <span className="text-xs text-gray-500 font-medium">
                            {achievement.category.charAt(0).toUpperCase() + achievement.category.slice(1)} Achievement
                          </span>
                          <Badge variant="outline" className={`${isUnlocked ? 'border-amber-200 text-amber-600' : 'border-gray-200 text-gray-400'}`}>
                            <Award className="h-3 w-3 mr-1" />
                            {achievement.points} Points
                          </Badge>
                        </div>
                      </CardFooter>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>
          
          <TabsContent value="unlocked" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredAchievements.map((achievement) => {
                return (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={animatedEntries[achievement.id] ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="overflow-hidden border border-amber-200 bg-white/80 backdrop-blur-sm transition-all duration-300 hover:shadow-md">
                      <CardHeader className="relative pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg font-bold text-[#333]">
                            {achievement.name}
                          </CardTitle>
                          
                          <Badge className="bg-[#ebbd34] text-white">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Unlocked
                          </Badge>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="flex items-center mb-3">
                          <div className="rounded-full p-3 mr-3 bg-amber-100 text-amber-600">
                            {achievement.category === 'daily' ? (
                              <Clock className="h-5 w-5" />
                            ) : achievement.category === 'social' ? (
                              <Star className="h-5 w-5" />
                            ) : (
                              <Trophy className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">{achievement.description}</p>
                            
                            <div className="mt-2">
                              <Progress 
                                value={100} 
                                className="h-2 bg-gray-100" 
                                indicatorClassName="bg-green-400" 
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Completed!
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      
                      <CardFooter className="pt-0 pb-4">
                        <div className="w-full flex justify-between items-center">
                          <span className="text-xs text-gray-500 font-medium">
                            {achievement.category.charAt(0).toUpperCase() + achievement.category.slice(1)} Achievement
                          </span>
                          <Badge variant="outline" className="border-amber-200 text-amber-600">
                            <Award className="h-3 w-3 mr-1" />
                            {achievement.points} Points
                          </Badge>
                        </div>
                      </CardFooter>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>
          
          <TabsContent value="locked" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredAchievements.map((achievement) => {
                const progress = getAchievementProgress(achievement.id);
                
                return (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={animatedEntries[achievement.id] ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="overflow-hidden border border-gray-200 bg-white/50 backdrop-blur-sm transition-all duration-300 hover:shadow-md">
                      <CardHeader className="relative pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg font-bold text-[#333]">
                            {achievement.name}
                          </CardTitle>
                          
                          <Badge variant="outline" className="text-gray-500 border-gray-300">
                            <Lock className="h-3 w-3 mr-1" />
                            Locked
                          </Badge>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="flex items-center mb-3">
                          <div className="rounded-full p-3 mr-3 bg-gray-100 text-gray-400">
                            {achievement.category === 'daily' ? (
                              <Clock className="h-5 w-5" />
                            ) : achievement.category === 'social' ? (
                              <Star className="h-5 w-5" />
                            ) : (
                              <Trophy className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">{achievement.description}</p>
                            
                            {achievement.threshold && (
                              <div className="mt-2">
                                <Progress 
                                  value={progress} 
                                  className="h-2 bg-gray-100" 
                                  indicatorClassName="bg-[#ebbd34]" 
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  {progress}% Complete
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                      
                      <CardFooter className="pt-0 pb-4">
                        <div className="w-full flex justify-between items-center">
                          <span className="text-xs text-gray-500 font-medium">
                            {achievement.category.charAt(0).toUpperCase() + achievement.category.slice(1)} Achievement
                          </span>
                          <Badge variant="outline" className="border-gray-200 text-gray-400">
                            <Award className="h-3 w-3 mr-1" />
                            {achievement.points} Points
                          </Badge>
                        </div>
                      </CardFooter>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
        
        {filteredAchievements.length === 0 && (
          <div className="text-center p-12 bg-white/60 backdrop-blur-sm rounded-lg border border-gray-200">
            <div className="inline-block p-3 bg-amber-100 rounded-full mb-4">
              <Trophy className="h-8 w-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No Achievements Found</h2>
            <p className="text-gray-600">
              {activeTab === 'unlocked' 
                ? "You haven't unlocked any achievements yet. Keep using the app to earn more!" 
                : activeTab === 'locked'
                ? "All achievements are unlocked! Great job!"
                : "No achievements available. Check back later!"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Achievements;
