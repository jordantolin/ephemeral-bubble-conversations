import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings, ChevronLeft, LogOut, Award, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/bubbleWorld/NavigationBar";
import ProfileForm from "@/components/profile/ProfileForm";
import AvatarUpload from "@/components/profile/AvatarUpload";
import useGamification from "@/hooks/useGamification";
import GamificationCard from "@/components/gamification/GamificationCard";
import NotificationsPopover from "@/components/gamification/NotificationsPopover";
import AchievementsSection from "@/components/gamification/AchievementsSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const { user, signOut, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Add gamification hook
  const {
    profile: gamificationProfile,
    profileLoading: gamificationLoading,
    notifications,
    notificationsLoading,
    unreadNotifications,
    markAsRead,
    markAllAsRead,
    progress,
    nextLevelPoints
  } = useGamification();
  
  // Add state for search functionality
  const [searchQuery, setSearchQuery] = useState("");
  
  // Default active tab
  const [activeTab, setActiveTab] = useState("overview");
  
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
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#ebbd34]" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#FEF7E4]">
      <Navbar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      
      <main className="container max-w-5xl mx-auto px-4 pt-24 pb-12">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-[#ebbd34]/10 p-4 flex items-center justify-between">
            <button 
              onClick={() => navigate(-1)}
              className="text-[#ebbd34] hover:text-[#ebbd34]/80 flex items-center"
            >
              <ChevronLeft className="h-5 w-5 mr-1" />
              <span>Back</span>
            </button>
            
            <h1 className="text-xl font-semibold text-[#ebbd34]">My Profile</h1>
            
            <div className="flex gap-2">
              {!isEditing && (
                <>
                  <NotificationsPopover 
                    notifications={notifications}
                    unreadCount={unreadNotifications}
                    onMarkAsRead={markAsRead}
                    onMarkAllAsRead={markAllAsRead}
                    loading={notificationsLoading}
                  />
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-[#ebbd34] hover:text-[#ebbd34]/80"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                </>
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
                
                {/* Level Badge if not editing */}
                {!isEditing && gamificationProfile && (
                  <div className="mt-3 bg-[#ebbd34]/10 px-3 py-1 rounded-full flex items-center gap-1">
                    <span className="text-xs font-semibold text-[#ebbd34]">Level {gamificationProfile.level}</span>
                  </div>
                )}
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
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">
                        {profile?.display_name || user.email?.split('@')[0] || 'User'}
                      </h2>
                      <p className="text-[#ebbd34] text-sm">
                        @{profile?.username || user.email?.split('@')[0] || 'user'}
                      </p>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      <p>Email: {user.email}</p>
                      <p>Member since: {new Date(user.created_at || Date.now()).toLocaleDateString()}</p>
                    </div>
                    
                    {/* Tabs for different sections */}
                    <Tabs 
                      defaultValue="overview" 
                      value={activeTab}
                      onValueChange={setActiveTab}
                      className="pt-6"
                    >
                      <TabsList className="bg-[#ebbd34]/10 grid w-full grid-cols-3">
                        <TabsTrigger value="overview" className="text-[#ebbd34] data-[state=active]:bg-[#ebbd34] data-[state=active]:text-white">
                          Overview
                        </TabsTrigger>
                        <TabsTrigger value="stats" className="text-[#ebbd34] data-[state=active]:bg-[#ebbd34] data-[state=active]:text-white">
                          Stats
                        </TabsTrigger>
                        <TabsTrigger value="achievements" className="text-[#ebbd34] data-[state=active]:bg-[#ebbd34] data-[state=active]:text-white">
                          Achievements
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="overview" className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">Activity</h3>
                            
                            <div className="grid grid-cols-2 gap-4 text-center">
                              <div className="bg-[#ebbd34]/5 p-3 rounded-lg">
                                <p className="text-2xl font-bold text-[#ebbd34]">
                                  {reflectedBubbles?.length || 0}
                                </p>
                                <p className="text-xs text-gray-600">Reflected Bubbles</p>
                              </div>
                              
                              <div className="bg-[#ebbd34]/5 p-3 rounded-lg">
                                <p className="text-2xl font-bold text-[#ebbd34]">
                                  {gamificationProfile?.message_points ? Math.floor(gamificationProfile.message_points / 10) : 0}
                                </p>
                                <p className="text-xs text-gray-600">Messages Sent</p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Gamification Overview Card */}
                          <GamificationCard 
                            profile={gamificationProfile}
                            progress={progress}
                            nextLevelPoints={nextLevelPoints}
                          />
                        </div>
                        
                        <Button
                          onClick={handleLogout}
                          variant="outline"
                          className="w-full mt-6 border-red-300 text-red-500 hover:bg-red-50"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Log Out
                        </Button>
                      </TabsContent>
                      
                      <TabsContent value="stats" className="pt-4">
                        <div className="space-y-4">
                          {/* Stats Details */}
                          <div className="bg-[#ebbd34]/5 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-[#ebbd34] mb-3">Your Progress</h3>
                            
                            <div className="space-y-4">
                              {/* Progress Bar */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span>Level {gamificationProfile?.level || 1}</span>
                                  <span>Level {(gamificationProfile?.level || 1) + 1}</span>
                                </div>
                                <div className="h-2 bg-[#ebbd34]/20 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-[#ebbd34]" 
                                    style={{ width: `${progress}%` }}
                                  ></div>
                                </div>
                                <p className="text-xs text-center text-gray-500">
                                  {nextLevelPoints - (gamificationProfile?.points || 0)} XP needed for next level
                                </p>
                              </div>
                              
                              {/* Points Breakdown */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="p-3 bg-white rounded-lg text-center shadow-sm">
                                  <p className="text-xs text-gray-500">Total Points</p>
                                  <p className="text-2xl font-bold text-[#ebbd34]">{gamificationProfile?.points || 0}</p>
                                </div>
                                <div className="p-3 bg-white rounded-lg text-center shadow-sm">
                                  <p className="text-xs text-gray-500">Current Level</p>
                                  <p className="text-2xl font-bold text-[#ebbd34]">{gamificationProfile?.level || 1}</p>
                                </div>
                                <div className="p-3 bg-white rounded-lg text-center shadow-sm">
                                  <p className="text-xs text-gray-500">Daily Streak</p>
                                  <p className="text-2xl font-bold text-[#ebbd34]">{gamificationProfile?.daily_streak || 0}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Points Details */}
                          <div className="bg-white shadow rounded-lg overflow-hidden">
                            <div className="bg-[#ebbd34]/10 px-4 py-3">
                              <h3 className="font-medium text-[#ebbd34]">Points Breakdown</h3>
                            </div>
                            <div className="p-4">
                              <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                      <Zap className="h-4 w-4 text-blue-500" />
                                    </div>
                                    <span>Bubble Points</span>
                                  </div>
                                  <span className="font-semibold">{gamificationProfile?.bubble_points || 0}</span>
                                </div>
                                
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                                      <Award className="h-4 w-4 text-purple-500" />
                                    </div>
                                    <span>Reflection Points</span>
                                  </div>
                                  <span className="font-semibold">{gamificationProfile?.reflection_points || 0}</span>
                                </div>
                                
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                      <Award className="h-4 w-4 text-green-500" />
                                    </div>
                                    <span>Message Points</span>
                                  </div>
                                  <span className="font-semibold">{gamificationProfile?.message_points || 0}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="achievements" className="pt-4">
                        <AchievementsSection 
                          profile={gamificationProfile}
                          loading={gamificationLoading}
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
