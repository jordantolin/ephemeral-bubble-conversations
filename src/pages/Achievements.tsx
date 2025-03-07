
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGamification } from "@/context/GamificationContext";
import { useAuth } from "@/context/AuthContext";
import { Award, Trophy, Target, Crown, ArrowLeft, Star, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import LevelProgress from "@/components/gamification/LevelProgress";

const Achievements: React.FC = () => {
  const { profile, achievements, isLoading } = useGamification();
  const { profile: userProfile } = useAuth();
  const navigate = useNavigate();
  
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: "easeOut"
      }
    })
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-secondary/20 pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="animate-pulse flex flex-col gap-8">
            <div className="h-10 w-40 bg-gray-200 rounded"></div>
            <div className="h-40 w-full bg-gray-200 rounded-lg"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Calculate achievement completion percentage
  const achievementPercentage = achievements.length > 0 
    ? Math.round((achievements.filter(a => a.unlocked).length / achievements.length) * 100) 
    : 0;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-secondary/20 pt-20 pb-20 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            className="mr-2" 
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl md:text-4xl font-bold text-[#ebbd34]">
            Your Achievements
          </h1>
        </div>
        
        {/* Profile Stats Card */}
        <motion.div 
          className="bg-white/70 backdrop-blur-sm rounded-xl shadow-md p-4 md:p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex flex-col items-center md:items-start md:pr-6 md:border-r border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-1">
                {userProfile?.display_name || "Bubbler"}
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                @{userProfile?.username?.split('@')[0] || "user"}
              </p>
              
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="bg-[#ebbd34] rounded-xl px-3 py-1 flex items-center">
                  <Crown className="h-4 w-4 text-white mr-1" />
                  <span className="text-white font-semibold text-sm">Level {profile.level}</span>
                </div>
                
                <Badge variant="outline" className="border-[#ebbd34]/30 text-[#ebbd34]/80">
                  <Clock className="h-3 w-3 mr-1" />
                  {profile.dailyStreak} day streak
                </Badge>
              </div>
            </div>
            
            <div className="flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-4">
                <div className="bg-[#ebbd34]/10 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600 mb-1">Total Points</p>
                  <p className="text-xl md:text-2xl font-bold text-[#ebbd34]">{profile.points}</p>
                </div>
                
                <div className="bg-[#ebbd34]/10 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600 mb-1">Achievements</p>
                  <p className="text-xl md:text-2xl font-bold text-[#ebbd34]">
                    {achievements.filter(a => a.unlocked).length}/{achievements.length}
                  </p>
                </div>
                
                <div className="bg-[#ebbd34]/10 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600 mb-1">Daily Streak</p>
                  <p className="text-xl md:text-2xl font-bold text-[#ebbd34]">{profile.dailyStreak} days</p>
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                  <span>Achievement Progress</span>
                  <span>{achievementPercentage}%</span>
                </div>
                <Progress value={achievementPercentage} className="h-2 bg-[#ebbd34]/20" />
                <div className="mt-3">
                  <LevelProgress />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Achievements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {achievements.map((achievement, index) => (
              <motion.div
                key={achievement.id}
                className={`bg-white/70 backdrop-blur-sm rounded-lg shadow-sm p-4 border ${
                  achievement.unlocked 
                    ? 'border-[#ebbd34]/30' 
                    : 'border-gray-200 opacity-70'
                }`}
                custom={index}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
                layout
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
              >
                <div className="flex items-start">
                  <div className={`rounded-full p-3 mr-3 flex-shrink-0 ${
                    achievement.unlocked ? 'bg-[#ebbd34]' : 'bg-gray-200'
                  }`}>
                    {achievement.icon || <Trophy className={`h-5 w-5 ${
                      achievement.unlocked ? 'text-white' : 'text-gray-400'
                    }`} />}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className={`font-semibold ${
                        achievement.unlocked ? 'text-gray-800' : 'text-gray-500'
                      }`}>
                        {achievement.name}
                      </h3>
                      <div className="flex items-center">
                        <Star className={`h-4 w-4 mr-1 ${
                          achievement.unlocked ? 'text-[#ebbd34]' : 'text-gray-300'
                        }`} />
                        <span className={`text-xs font-medium ${
                          achievement.unlocked ? 'text-[#ebbd34]' : 'text-gray-400'
                        }`}>
                          {achievement.points}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-500 mt-1 mb-2">
                      {achievement.description}
                    </p>
                    
                    {achievement.progress !== undefined && achievement.maxProgress !== undefined && (
                      <div className="mt-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-500">Progress</span>
                          <span className="text-xs font-medium text-gray-600">
                            {achievement.progress}/{achievement.maxProgress}
                          </span>
                        </div>
                        <Progress 
                          value={(achievement.progress / achievement.maxProgress) * 100} 
                          className={`h-1.5 ${
                            achievement.unlocked ? 'bg-[#ebbd34]/20' : 'bg-gray-200'
                          }`} 
                        />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Achievements;
