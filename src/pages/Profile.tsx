
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings, ChevronLeft, LogOut, Trophy, Bell, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/bubbleWorld/NavigationBar";
import ProfileForm from "@/components/profile/ProfileForm";
import AvatarUpload from "@/components/profile/AvatarUpload";
import AchievementsTab from "@/components/gamification/AchievementsTab";
import LevelProgressBar from "@/components/gamification/LevelProgressBar";
import NotificationItem from "@/components/gamification/NotificationItem";
import { useGamificationContext } from "@/context/GamificationContext";
import { ScrollArea } from "@/components/ui/scroll-area";

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const { user, signOut, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Add state for search functionality
  const [searchQuery, setSearchQuery] = useState("");
  
  // Use the gamification hook
  const {
    notifications,
    isLoadingNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    unreadNotificationsCount
  } = useGamificationContext();
  
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
  
  // Extract points and level from profile, defaulting to 0 and 1
  const points = profile?.points || 0;
  const level = profile?.level || 1;
  
  return (
    <div className="min-h-screen bg-[#FEF7E4]">
      <Navbar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      
      <main className="container max-w-4xl mx-auto px-4 pt-24 pb-12">
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
            
            <div>
              {isEditing ? (
                <div className="w-5" /> // Empty space for alignment
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-[#ebbd34] hover:text-[#ebbd34]/80"
                >
                  <Settings className="h-5 w-5" />
                </button>
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
                
                {/* Level badge */}
                <div className="mt-4 flex items-center justify-center bg-[#ebbd34]/10 text-[#ebbd34] rounded-full px-4 py-1">
                  <Sparkles className="h-4 w-4 mr-1" />
                  <span className="font-semibold">Level {level}</span>
                </div>
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
                  <div className="space-y-6">
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
                    
                    {/* Points and Level Progress */}
                    <div className="p-4 bg-[#ebbd34]/5 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-gray-700">Experience Points</h3>
                        <div className="text-[#ebbd34] font-bold">{points} points</div>
                      </div>
                      <LevelProgressBar points={points} level={level} />
                    </div>
                    
                    <div className="pt-4">
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
                            {unreadNotificationsCount}
                          </p>
                          <p className="text-xs text-gray-600">New Notifications</p>
                        </div>
                      </div>
                    
                      <Button
                        onClick={handleLogout}
                        variant="outline"
                        className="w-full mt-4 border-red-300 text-red-500 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Log Out
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Tabs for Achievements and Notifications */}
          <div className="p-6 border-t">
            <Tabs defaultValue="achievements">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="achievements" className="flex items-center justify-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Achievements
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center justify-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notifications
                  {unreadNotificationsCount > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center rounded-full bg-[#ebbd34] w-5 h-5 text-[10px] font-medium text-white">
                      {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="achievements">
                <AchievementsTab />
              </TabsContent>
              
              <TabsContent value="notifications">
                <div className="space-y-4">
                  {/* Actions header */}
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-700">
                      Recent Activity
                    </h3>
                    {unreadNotificationsCount > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => markAllNotificationsAsRead.mutate()}
                        className="text-[#ebbd34] border-[#ebbd34]/20 hover:bg-[#ebbd34]/10"
                      >
                        Mark all as read
                      </Button>
                    )}
                  </div>
                  
                  {/* Notifications list */}
                  <div className="border rounded-lg overflow-hidden">
                    {isLoadingNotifications ? (
                      <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-[#ebbd34]" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="text-center py-12">
                        <Bell className="mx-auto h-12 w-12 text-gray-300" />
                        <h3 className="mt-4 text-lg font-medium text-gray-900">No notifications yet</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          You'll receive notifications when you earn achievements and points
                        </p>
                      </div>
                    ) : (
                      <ScrollArea className="h-96">
                        <div className="space-y-0">
                          {notifications.map((notification) => (
                            <NotificationItem
                              key={notification.id}
                              notification={notification}
                              onMarkAsRead={(id) => markNotificationAsRead.mutate(id)}
                            />
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
