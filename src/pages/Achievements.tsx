
import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGamification } from "@/context/GamificationContext";
import { useAuth } from "@/context/AuthContext";
import { Award, Trophy, Target, Crown, ArrowLeft, Star, Clock, Medal, Sparkles, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import LevelProgress from "@/components/gamification/LevelProgress";
import { useToast } from "@/hooks/use-toast";
import ComponentErrorBoundary from "@/components/errorHandling/ComponentErrorBoundary";

const Achievements: React.FC = () => {
  const { profile, achievements, isLoading, refreshGamificationProfile } = useGamification();
  const { profile: userProfile, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Refresh profile on mount
  useEffect(() => {
    if (user) {
      refreshGamificationProfile().catch(err => {
        console.error("Error refreshing achievements:", err);
        toast({
          title: "Couldn't refresh achievements",
          description: "Please try again later",
          variant: "destructive",
        });
      });
    }
  }, [user, refreshGamificationProfile, toast]);
  
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
  
  // Get achievement icon based on status
  const getAchievementIcon = (achievement: any) => {
    if (!achievement.icon) {
      if (achievement.id.includes('bubble')) return <Gift className="h-5 w-5 text-white" />;
      if (achievement.id.includes('social')) return <Medal className="h-5 w-5 text-white" />;
      if (achievement.id.includes('streak')) return <Clock className="h-5 w-5 text-white" />;
      if (achievement.id.includes('reflection')) return <Sparkles className="h-5 w-5 text-white" />;
      if (achievement.id.includes('popular')) return <Target className="h-5 w-5 text-white" />;
      return <Trophy className="h-5 w-5 text-white" />;
    }
    return achievement.icon;
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white to-yellow-50/60 pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="animate-pulse flex flex-col gap-8">
            <div className="flex items-center mb-4">
              <div className="h-8 w-8 bg-gray-200 rounded-full mr-2"></div>
              <div className="h-8 w-40 bg-gray-200 rounded"></div>
            </div>
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
  
  return (
    <ComponentErrorBoundary name="Achievements Page">
      <div className="min-h-screen bg-gradient-to-br from-white to-yellow-50/60 text-gray-800 pt-20 pb-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div 
            className="flex items-center mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Button 
              variant="ghost" 
              size="icon" 
              className="mr-2 text-gray-700" 
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl md:text-4xl font-bold text-[#ebbd34]">
              Your Achievements
            </h1>
          </motion.div>
          
          {/* Profile Stats Card */}
          <motion.div 
            className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-4 md:p-6 mb-8 border border-[#ebbd34]/10"
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
                  <motion.div 
                    className="bg-gradient-to-r from-[#ebbd34] to-amber-500 rounded-xl px-3 py-1 flex items-center shadow-sm"
                    whileHover={{ y: -2 }}
                    transition={{ type: "spring", stiffness: 700, damping: 15 }}
                  >
                    <Crown className="h-4 w-4 text-white mr-1" />
                    <span className="text-white font-semibold text-sm">Level {profile.level}</span>
                  </motion.div>
                  
                  <Badge variant="outline" className="border-[#ebbd34]/30 text-[#ebbd34] bg-[#ebbd34]/5">
                    <Clock className="h-3 w-3 mr-1" />
                    {profile.dailyStreak} day streak
                  </Badge>
                </div>
              </div>
              
              <div className="flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-4">
                  <motion.div 
                    className="bg-gradient-to-br from-[#ebbd34]/10 to-amber-50 rounded-lg p-3 text-center border border-[#ebbd34]/10 shadow-sm"
                    whileHover={{ y: -5 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  >
                    <p className="text-xs text-gray-600 mb-1">Total Points</p>
                    <p className="text-xl md:text-2xl font-bold text-[#ebbd34]">{profile.points}</p>
                  </motion.div>
                  
                  <motion.div 
                    className="bg-gradient-to-br from-[#ebbd34]/10 to-amber-50 rounded-lg p-3 text-center border border-[#ebbd34]/10 shadow-sm"
                    whileHover={{ y: -5 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  >
                    <p className="text-xs text-gray-600 mb-1">Achievements</p>
                    <p className="text-xl md:text-2xl font-bold text-[#ebbd34]">
                      {achievements.filter(a => a.unlocked).length}/{achievements.length}
                    </p>
                  </motion.div>
                  
                  <motion.div 
                    className="bg-gradient-to-br from-[#ebbd34]/10 to-amber-50 rounded-lg p-3 text-center border border-[#ebbd34]/10 shadow-sm"
                    whileHover={{ y: -5 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  >
                    <p className="text-xs text-gray-600 mb-1">Daily Streak</p>
                    <p className="text-xl md:text-2xl font-bold text-[#ebbd34]">{profile.dailyStreak} days</p>
                  </motion.div>
                </div>
                
                <div className="mt-4">
                  <LevelProgress />
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
                  className={`bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-4 border ${
                    achievement.unlocked 
                      ? 'border-[#ebbd34]/30' 
                      : 'border-gray-200'
                  } ${achievement.unlocked ? '' : 'opacity-75'}`}
                  custom={index}
                  initial="hidden"
                  animate="visible"
                  variants={cardVariants}
                  layout
                  whileHover={{ y: -3, boxShadow: "0 10px 25px -5px rgba(235, 189, 52, 0.1), 0 8px 10px -6px rgba(235, 189, 52, 0.1)" }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-start">
                    <motion.div 
                      className={`rounded-full p-3 mr-3 flex-shrink-0 ${
                        achievement.unlocked 
                          ? 'bg-gradient-to-br from-[#ebbd34] to-amber-500' 
                          : 'bg-gray-200'
                      } shadow-sm`}
                      whileHover={{ rotate: achievement.unlocked ? 10 : 0, scale: achievement.unlocked ? 1.1 : 1 }}
                      transition={{ type: "spring", stiffness: 700, damping: 15 }}
                    >
                      {getAchievementIcon(achievement)}
                    </motion.div>
                    
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
                              achievement.unlocked 
                                ? 'bg-[#ebbd34]/20' 
                                : 'bg-gray-200'
                            }`}
                          />
                        </div>
                      )}
                      
                      {achievement.unlocked && (
                        <motion.div 
                          className="mt-2 pt-2 border-t border-[#ebbd34]/10 flex justify-end"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 }}
                        >
                          <Badge variant="outline" className="text-xs bg-[#ebbd34]/5 text-[#ebbd34]">
                            <Trophy className="h-3 w-3 mr-1" />
                            Unlocked
                          </Badge>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </ComponentErrorBoundary>
  );
};

export default Achievements;
