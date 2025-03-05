
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useGamification } from "@/context/GamificationContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, Settings, ChevronLeft, LogOut, Calendar, Activity, 
  MessageCircle, Sparkles, Trophy, Award, Target, Gift, Clock, 
  Star, Flame, Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import NavigationBar from "@/components/bubbleWorld/NavigationBar";
import ProfileForm from "@/components/profile/ProfileForm";
import AvatarUpload from "@/components/profile/AvatarUpload";
import { motion, AnimatePresence } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const { user, signOut, profile } = useAuth();
  const { 
    profile: gamificationProfile,
    achievements, 
    addPoints,
    checkAchievement,
    refreshGamificationProfile,
    getAchievementIcon
  } = useGamification();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Add state for search functionality
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshTime, setRefreshTime] = useState(new Date());
  
  // Refresh gamification profile every second
  useEffect(() => {
    const timer = setInterval(() => {
      refreshGamificationProfile();
      setRefreshTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, [refreshGamificationProfile]);
  
  // Fetch the user's reflected bubbles
  const { data: reflectedBubbles, isLoading: reflectsLoading } = useQuery({
    queryKey: ['reflects', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('reflects')
        .select(`
          bubble_id,
          created_at,
          bubbles(id, name, topic, reflect_count, expires_at)
        `)
        .eq('username', profile?.username || user.email || '');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
  
  // Fetch message count
  const { data: messageCount = 0, isLoading: messagesLoading } = useQuery({
    queryKey: ['messageCount', user?.id],
    queryFn: async () => {
      if (!user || !profile?.username) return 0;
      
      const { count, error } = await supabase
        .from('bubble_messages')
        .select('id', { count: 'exact', head: true })
        .eq('username', profile.username);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user && !!profile?.username,
  });
  
  // Calculate points needed for current level and next level
  const pointsForCurrentLevel = Math.pow(gamificationProfile.level - 1, 2) * 100;
  const pointsForNextLevel = Math.pow(gamificationProfile.level, 2) * 100;
  const pointsNeeded = pointsForNextLevel - pointsForCurrentLevel;
  const currentLevelPoints = gamificationProfile.points - pointsForCurrentLevel;
  const progressPercentage = Math.min(Math.round((currentLevelPoints / pointsNeeded) * 100), 100);
  
  // Function to show icon based on achievement type
  const renderAchievementIcon = (iconType) => {
    switch (iconType) {
      case 'award': return <Award className="h-6 w-6" />;
      case 'star': return <Star className="h-6 w-6" />;
      case 'trophy': return <Trophy className="h-6 w-6" />;
      case 'target': return <Target className="h-6 w-6" />;
      case 'gift': return <Gift className="h-6 w-6" />;
      default: return <Trophy className="h-6 w-6" />;
    }
  };
  
  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account"
      });
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "Error logging out",
        description: error.message || "An error occurred while logging out",
        variant: "destructive"
      });
    }
  };
  
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FEF7E4]">
        <Loader2 className="h-8 w-8 animate-spin text-[#ebbd34]" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#FEF7E4]">
      <NavigationBar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      
      <main className="container max-w-4xl mx-auto px-4 pt-24 pb-12">
        <motion.div 
          className="bg-white rounded-2xl shadow-md overflow-hidden mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#ebbd34]/20 to-[#ebbd34]/5 p-4 flex items-center justify-between">
            <button 
              onClick={() => navigate(-1)}
              className="text-[#ebbd34] hover:text-[#ebbd34]/80 flex items-center transition-colors"
            >
              <ChevronLeft className="h-5 w-5 mr-1" />
              <span>Back</span>
            </button>
            
            <h1 className="text-xl font-semibold text-[#ebbd34]">My Profile</h1>
            
            <div>
              {isEditing ? (
                <div className="w-5" /> /* Empty space for alignment */
              ) : (
                <motion.button
                  onClick={() => setIsEditing(true)}
                  className="text-[#ebbd34] hover:text-[#ebbd34]/80 transition-all duration-200 hover:scale-110"
                  whileHover={{ rotate: 15 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Settings className="h-5 w-5" />
                </motion.button>
              )}
            </div>
          </div>
          
          {/* Profile Content */}
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
              {/* Avatar Section */}
              <div className="flex flex-col items-center">
                <AvatarUpload 
                  userId={user.id}
                  avatarUrl={profile?.avatar_url || null}
                  displayName={profile?.display_name || user.email?.split('@')[0] || null}
                  size="lg"
                />
              </div>
              
              {/* Profile Details */}
              <div className="flex-1 w-full">
                {isEditing ? (
                  <ProfileForm 
                    userId={user.id}
                    initialUsername={profile?.username || user.email?.split('@')[0] || ''}
                    initialDisplayName={profile?.display_name || null}
                    avatarUrl={profile?.avatar_url || null}
                    onCancel={() => setIsEditing(false)}
                  />
                ) : (
                  <motion.div 
                    className="space-y-5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
                        {profile?.display_name || user.email?.split('@')[0] || 'User'}
                      </h2>
                      <p className="text-[#ebbd34] text-sm sm:text-base font-medium">
                        @{profile?.username || user.email?.split('@')[0] || 'user'}
                      </p>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <p>{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <p>Member since: {new Date(user.created_at || Date.now()).toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    <Separator className="my-4 bg-gray-200" />
                    
                    <div className="pt-2">
                      <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
                        <Activity className="w-5 h-5 mr-2 text-[#ebbd34]" />
                        Activity Summary
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <motion.div 
                          className="bg-[#ebbd34]/5 p-4 rounded-lg shadow-sm hover:shadow transition-all duration-200"
                          whileHover={{ y: -4 }}
                        >
                          <p className="text-3xl font-bold text-[#ebbd34]">
                            {reflectsLoading ? (
                              <Loader2 className="h-6 w-6 mx-auto animate-spin" />
                            ) : (
                              reflectedBubbles?.length || 0
                            )}
                          </p>
                          <p className="text-sm text-gray-600 mt-1 flex items-center justify-center gap-1">
                            <Sparkles className="w-4 h-4 text-[#ebbd34]" />
                            Reflected Bubbles
                          </p>
                        </motion.div>
                        
                        <motion.div 
                          className="bg-[#ebbd34]/5 p-4 rounded-lg shadow-sm hover:shadow transition-all duration-200"
                          whileHover={{ y: -4 }}
                        >
                          <p className="text-3xl font-bold text-[#ebbd34]">
                            {messagesLoading ? (
                              <Loader2 className="h-6 w-6 mx-auto animate-spin" />
                            ) : (
                              messageCount
                            )}
                          </p>
                          <p className="text-sm text-gray-600 mt-1 flex items-center justify-center gap-1">
                            <MessageCircle className="w-4 h-4 text-[#ebbd34]" />
                            Messages Sent
                          </p>
                        </motion.div>
                      </div>
                    </div>
                    
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      className="w-full mt-6 border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Log Out
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Gamification Dashboard */}
        <motion.div
          className="bg-white rounded-2xl shadow-md overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="bg-gradient-to-r from-[#ebbd34]/20 to-[#ebbd34]/5 p-4">
            <h2 className="text-xl font-semibold text-[#ebbd34] flex items-center">
              <Trophy className="h-5 w-5 mr-2" />
              Gamification Dashboard
            </h2>
          </div>
          
          <Tabs defaultValue="overview" className="p-6">
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
              <TabsTrigger value="stats">Detailed Stats</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6">
              {/* Level Card */}
              <div className="bg-gradient-to-r from-[#ebbd34]/10 to-[#ebbd34]/5 rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#ebbd34] rounded-full w-10 h-10 flex items-center justify-center text-white font-bold text-lg">
                      {gamificationProfile.level}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">Level {gamificationProfile.level}</h3>
                      <p className="text-sm text-gray-600">
                        Next level: {pointsNeeded - currentLevelPoints} points needed
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[#ebbd34]" />
                    <span className="font-bold text-[#ebbd34]">{gamificationProfile.points} XP</span>
                  </div>
                </div>
                
                <div className="relative pt-1">
                  <Progress value={progressPercentage} className="h-3 bg-[#ebbd34]/20" />
                  <div className="flex justify-between mt-1 text-xs text-gray-500">
                    <span>Level {gamificationProfile.level}</span>
                    <span>{currentLevelPoints}/{pointsNeeded} XP</span>
                    <span>Level {gamificationProfile.level + 1}</span>
                  </div>
                </div>
              </div>
              
              {/* Streak Card */}
              <div className="bg-[#FEF7E4] rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-800 flex items-center">
                    <Flame className="h-5 w-5 mr-2 text-orange-500" />
                    Daily Streak
                  </h3>
                  <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">
                    <Clock className="h-3 w-3 mr-1" />
                    Updated: {refreshTime.toLocaleTimeString()}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-center my-2">
                  <div className="bg-gradient-to-r from-orange-500 to-[#ebbd34] rounded-full w-16 h-16 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                    {gamificationProfile.dailyStreak}
                  </div>
                </div>
                
                <p className="text-center text-sm text-gray-600 mt-2">
                  {gamificationProfile.dailyStreak > 0 
                    ? `You've been active for ${gamificationProfile.dailyStreak} consecutive days!` 
                    : "Start your streak by participating today!"}
                </p>
              </div>
              
              {/* Points Summary */}
              <div className="grid grid-cols-3 gap-4">
                <motion.div 
                  className="bg-blue-50 rounded-xl p-4 text-center"
                  whileHover={{ y: -5 }}
                >
                  <div className="bg-blue-100 rounded-full w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                    <MessageCircle className="h-6 w-6 text-blue-600" />
                  </div>
                  <p className="font-bold text-xl text-blue-600">{gamificationProfile.messagePoints}</p>
                  <p className="text-xs text-gray-600">Message Points</p>
                </motion.div>
                
                <motion.div 
                  className="bg-purple-50 rounded-xl p-4 text-center"
                  whileHover={{ y: -5 }}
                >
                  <div className="bg-purple-100 rounded-full w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-purple-600" />
                  </div>
                  <p className="font-bold text-xl text-purple-600">{gamificationProfile.bubblePoints}</p>
                  <p className="text-xs text-gray-600">Bubble Points</p>
                </motion.div>
                
                <motion.div 
                  className="bg-green-50 rounded-xl p-4 text-center"
                  whileHover={{ y: -5 }}
                >
                  <div className="bg-green-100 rounded-full w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="font-bold text-xl text-green-600">{gamificationProfile.reflectionPoints}</p>
                  <p className="text-xs text-gray-600">Reflection Points</p>
                </motion.div>
              </div>
            </TabsContent>
            
            <TabsContent value="achievements" className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-gray-700">Your Achievements</h3>
                <Badge variant="outline" className="bg-[#ebbd34]/10 text-[#ebbd34] border-[#ebbd34]/20">
                  {achievements.filter(a => a.unlocked).length}/{achievements.length} Unlocked
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.map((achievement) => (
                  <motion.div 
                    key={achievement.id}
                    className={`rounded-lg p-4 border ${
                      achievement.unlocked 
                        ? 'border-[#ebbd34] bg-[#ebbd34]/5' 
                        : 'border-gray-200 bg-gray-50'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`rounded-full p-2 ${
                        achievement.unlocked 
                          ? 'bg-[#ebbd34]/20 text-[#ebbd34]' 
                          : 'bg-gray-200 text-gray-400'
                      }`}>
                        {renderAchievementIcon(achievement.iconType)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className={`font-semibold ${
                            achievement.unlocked ? 'text-gray-800' : 'text-gray-500'
                          }`}>
                            {achievement.name}
                          </h4>
                          <Badge variant="outline" className={`${
                            achievement.unlocked 
                              ? 'bg-[#ebbd34]/10 text-[#ebbd34] border-[#ebbd34]/20' 
                              : 'bg-gray-100 text-gray-400 border-gray-200'
                          }`}>
                            {achievement.points} XP
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-1">
                          {achievement.description}
                        </p>
                        
                        {!achievement.unlocked && achievement.progress !== undefined && (
                          <div className="mt-3">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-500">Progress</span>
                              <span className="text-gray-600 font-medium">
                                {achievement.progress}/{achievement.maxProgress}
                              </span>
                            </div>
                            <Progress 
                              value={(achievement.progress / achievement.maxProgress!) * 100} 
                              className="h-1.5 bg-gray-200" 
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="stats" className="space-y-6">
              <div className="bg-[#FEF7E4] rounded-xl p-5">
                <h3 className="font-bold text-gray-800 mb-4">Detailed Statistics</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-[#ebbd34]" />
                      <span className="text-sm font-medium text-gray-700">Total Points</span>
                    </div>
                    <span className="font-bold text-[#ebbd34]">{gamificationProfile.points} XP</span>
                  </div>
                  
                  <Separator className="my-2 bg-gray-200" />
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-blue-500" />
                      <span className="text-sm font-medium text-gray-700">Messages Sent</span>
                    </div>
                    <span className="font-bold text-blue-500">{messageCount}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      <span className="text-sm font-medium text-gray-700">Reflected Bubbles</span>
                    </div>
                    <span className="font-bold text-purple-500">{reflectedBubbles?.length || 0}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-[#ebbd34]" />
                      <span className="text-sm font-medium text-gray-700">Achievements Unlocked</span>
                    </div>
                    <span className="font-bold text-[#ebbd34]">
                      {achievements.filter(a => a.unlocked).length}/{achievements.length}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Flame className="h-5 w-5 text-orange-500" />
                      <span className="text-sm font-medium text-gray-700">Current Streak</span>
                    </div>
                    <span className="font-bold text-orange-500">{gamificationProfile.dailyStreak} days</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Last Active</span>
                    </div>
                    <span className="font-medium text-gray-800">
                      {new Date(gamificationProfile.lastActive).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="rounded-xl border border-gray-200 p-5">
                <h3 className="font-bold text-gray-800 mb-4">Points Breakdown</h3>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Messaging Points</span>
                      <span className="font-medium text-blue-600">{gamificationProfile.messagePoints} XP</span>
                    </div>
                    <Progress 
                      value={(gamificationProfile.messagePoints / gamificationProfile.points) * 100 || 0} 
                      className="h-2 bg-gray-100" 
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Bubble Points</span>
                      <span className="font-medium text-purple-600">{gamificationProfile.bubblePoints} XP</span>
                    </div>
                    <Progress 
                      value={(gamificationProfile.bubblePoints / gamificationProfile.points) * 100 || 0} 
                      className="h-2 bg-gray-100" 
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Reflection Points</span>
                      <span className="font-medium text-green-600">{gamificationProfile.reflectionPoints} XP</span>
                    </div>
                    <Progress 
                      value={(gamificationProfile.reflectionPoints / gamificationProfile.points) * 100 || 0} 
                      className="h-2 bg-gray-100" 
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
};

export default Profile;
