
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, User, TrendingUp, Sparkles, Trophy, Star, Edit, Sparkle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AvatarUpload from "@/components/profile/AvatarUpload";
import ProfileForm from "@/components/profile/ProfileForm";

interface Bubble {
  id: string;
  name: string;
  topic: string;
  description: string | null;
  reflect_count: number;
  expires_at: string;
}

const Profile = () => {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's reflected bubbles
  const { data: reflectedBubbles = [], isLoading: isLoadingBubbles } = useQuery({
    queryKey: ['reflectedBubbles', profile?.username],
    queryFn: async () => {
      if (!user || !profile?.username) return [];

      const { data: reflects, error } = await supabase
        .from('reflects')
        .select('bubble_id')
        .eq('username', profile.username);
      
      if (error) {
        console.error("Error fetching reflects:", error);
        toast({
          title: "Error fetching reflects",
          description: error.message,
          variant: "destructive"
        });
        return [];
      }

      if (reflects.length === 0) return [];

      const bubbleIds = reflects.map(r => r.bubble_id);
      const { data: bubbles, error: bubblesError } = await supabase
        .from('bubbles')
        .select('*')
        .in('id', bubbleIds);
      
      if (bubblesError) {
        console.error("Error fetching bubbles:", bubblesError);
        toast({
          title: "Error fetching bubbles",
          description: bubblesError.message,
          variant: "destructive"
        });
        return [];
      }

      return bubbles;
    },
    enabled: !!user && !!profile?.username
  });

  // Get user stats from reflected bubbles
  const userStats = {
    totalReflects: reflectedBubbles.length,
    topTopics: getTopTopics(reflectedBubbles),
    level: Math.min(Math.floor(reflectedBubbles.length / 5) + 1, 10)
  };

  function getTopTopics(bubbles: any[]) {
    const topicCounts: { [key: string]: number } = {};
    bubbles.forEach(bubble => {
      topicCounts[bubble.topic] = (topicCounts[bubble.topic] || 0) + 1;
    });
    
    return Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([topic]) => topic);
  }

  const handleAvatarUpdate = async (avatarUrl: string) => {
    if (!user) return;

    try {
      // Update profile with new avatar URL
      const { error } = await supabase
        .from('profiles')
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
        
      if (error) {
        console.error("Error updating profile with new avatar:", error);
        toast({
          title: "Profile update error",
          description: "Avatar was uploaded but profile couldn't be updated.",
          variant: "destructive"
        });
        return;
      }
      
      // Refresh profile data
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (error: any) {
      console.error("Avatar update error:", error);
      toast({
        title: "Error updating profile",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  const getAvatarFallback = () => {
    if (profile?.display_name) {
      const nameParts = profile.display_name.split(" ");
      if (nameParts.length >= 2) {
        return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
      }
      return profile.display_name.substring(0, 2).toUpperCase();
    }
    
    if (profile?.username) {
      return profile.username.substring(0, 2).toUpperCase();
    }
    
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }

    return "BT";
  };
  
  return (
    <div className="min-h-screen bg-[#FEF7E4]">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#ebbd34]/10">
        <div className="container mx-auto">
          <div className="flex items-center justify-between h-16 px-4">
            {/* Logo and Search Section */}
            <div className="flex items-center gap-6 flex-1">
              <Link to="/" className="flex items-center gap-2 shrink-0">
                <img 
                  src="/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png"
                  alt="Bubble Trouble"
                  className="w-8 h-8"
                />
                <span className="text-xl font-semibold hidden sm:inline text-[#ebbd34]">
                  Bubble Trouble
                </span>
              </Link>
              
              <div className="relative flex-1 max-w-md hidden sm:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#ebbd34]/70" />
                <input
                  type="search"
                  placeholder="Search bubbles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-full border-none bg-[#ebbd34]/5 text-[#ebbd34] placeholder:text-[#ebbd34]/50 focus:ring-2 focus:ring-[#ebbd34]/20 focus:outline-none"
                />
              </div>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center gap-1">
              <Link 
                to="/my-bubbles" 
                className={`nav-link flex items-center gap-2 px-4 py-2 rounded-full text-[#ebbd34] hover:bg-[#ebbd34]/5 transition-colors ${
                  location.pathname === '/my-bubbles' ? 'bg-[#ebbd34]/10' : ''
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">My Bubbles</span>
              </Link>
              <Link 
                to="/feed" 
                className={`nav-link flex items-center gap-2 px-4 py-2 rounded-full text-[#ebbd34] hover:bg-[#ebbd34]/5 transition-colors ${
                  location.pathname === '/feed' ? 'bg-[#ebbd34]/10' : ''
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Feed</span>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="hover:bg-[#ebbd34]/5 rounded-full text-[#ebbd34]"
                  >
                    <User className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white z-[100]">
                  <DropdownMenuItem className="flex flex-col items-start p-3">
                    <span className="font-medium text-[#ebbd34]">
                      {profile?.display_name || user?.email}
                    </span>
                    <span className="text-xs text-gray-500">
                      @{profile?.username || user?.email?.split('@')[0]}
                    </span>
                  </DropdownMenuItem>
                  <Link to="/">
                    <DropdownMenuItem>
                      <Star className="mr-2 h-4 w-4" />
                      <span>Bubble World</span>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuItem onClick={signOut}>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="mr-2 h-4 w-4"
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="sm:hidden px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#ebbd34]/70" />
            <input
              type="search"
              placeholder="Search bubbles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full border-none bg-[#ebbd34]/5 text-[#ebbd34] placeholder:text-[#ebbd34]/50 focus:ring-2 focus:ring-[#ebbd34]/20 focus:outline-none text-sm"
            />
          </div>
        </div>
      </nav>
      
      <main className="container mx-auto px-4 pt-28 sm:pt-24 pb-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-sm">
            {!isEditing ? (
              // Profile View Mode
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-2xl font-bold text-[#ebbd34]">My Profile</h1>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="gap-1.5 border-[#ebbd34]/20 text-[#ebbd34] hover:bg-[#ebbd34]/5"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit Profile</span>
                  </Button>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <Avatar className="w-24 h-24 border-4 border-[#ebbd34]">
                    <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.display_name || "Profile"} />
                    <AvatarFallback className="bg-[#ebbd34] text-white">{getAvatarFallback()}</AvatarFallback>
                  </Avatar>
                  
                  <div className="text-center sm:text-left flex-1">
                    <h1 className="text-3xl font-bold text-[#ebbd34]">
                      {profile?.display_name || profile?.username || "User"}
                    </h1>
                    <p className="text-gray-500 mt-1">
                      @{profile?.username || user?.email?.split('@')[0] || "user"}
                    </p>
                    
                    {/* Reposition the Reflect button to the right side */}
                    <div className="flex justify-end mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#ebbd34] hover:bg-[#ebbd34]/10"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        <span>Reflect</span>
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <Tabs defaultValue="bubbles" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger 
                        value="bubbles"
                        className="data-[state=active]:bg-[#ebbd34]/20 text-[#ebbd34]"
                      >
                        My Reflected Bubbles
                      </TabsTrigger>
                      <TabsTrigger 
                        value="badges"
                        className="data-[state=active]:bg-[#ebbd34]/20 text-[#ebbd34]"
                      >
                        Badges & Achievements
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="bubbles">
                      {isLoadingBubbles ? (
                        <div className="text-center py-8">
                          <div className="mx-auto w-8 h-8 border-4 border-[#ebbd34]/20 border-t-[#ebbd34] rounded-full animate-spin"></div>
                          <p className="mt-4 text-[#ebbd34]">Loading your bubbles...</p>
                        </div>
                      ) : reflectedBubbles.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-[#ebbd34]/10">
                            <Sparkles className="w-8 h-8 text-[#ebbd34]" />
                          </div>
                          <h3 className="text-lg font-medium text-[#ebbd34]">No reflected bubbles yet</h3>
                          <p className="text-gray-500 mt-2">Explore the bubble world and reflect on topics that interest you!</p>
                          <Link to="/">
                            <Button className="mt-4 bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white">
                              Explore Bubbles
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {reflectedBubbles.map((bubble: Bubble) => (
                            <Link key={bubble.id} to={`/bubble/${bubble.id}`}>
                              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-lg text-[#ebbd34]">{bubble.name}</CardTitle>
                                  <CardDescription>{bubble.topic}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                  <p className="text-sm text-gray-600 line-clamp-2">{bubble.description || "No description"}</p>
                                </CardContent>
                                <CardFooter className="pt-0">
                                  <div className="w-full flex justify-between items-center">
                                    <Badge className="text-xs bg-[#ebbd34]/10 text-[#ebbd34]">
                                      {bubble.reflect_count} reflects
                                    </Badge>
                                    <span className="text-xs text-gray-400">
                                      Expires {new Date(bubble.expires_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                </CardFooter>
                              </Card>
                            </Link>
                          ))}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="badges">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {userStats.totalReflects > 0 && (
                          <div className="p-4 rounded-xl text-center bg-[#ebbd34]/10">
                            <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 bg-[#ebbd34]/20">
                              <Star className="w-6 h-6 text-[#ebbd34]" />
                            </div>
                            <p className="mt-2 text-sm font-medium text-[#ebbd34]">Bubble Explorer</p>
                            <p className="text-xs text-gray-500">Reflected your first bubble</p>
                          </div>
                        )}
                        
                        {userStats.totalReflects >= 5 && (
                          <div className="p-4 rounded-xl text-center bg-[#ebbd34]/10">
                            <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 bg-[#ebbd34]/20">
                              <Trophy className="w-6 h-6 text-[#ebbd34]" />
                            </div>
                            <p className="mt-2 text-sm font-medium text-[#ebbd34]">Reflection Master</p>
                            <p className="text-xs text-gray-500">Reflected 5+ bubbles</p>
                          </div>
                        )}
                        
                        {userStats.topTopics.length > 0 && (
                          <div className="p-4 rounded-xl text-center bg-[#ebbd34]/10">
                            <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 bg-[#ebbd34]/20">
                              <Sparkle className="w-6 h-6 text-[#ebbd34]" />
                            </div>
                            <p className="mt-2 text-sm font-medium text-[#ebbd34]">Topic Enthusiast</p>
                            <p className="text-xs text-gray-500">Favorite: {userStats.topTopics[0]}</p>
                          </div>
                        )}
                        
                        {userStats.level >= 3 && (
                          <div className="p-4 rounded-xl text-center bg-[#ebbd34]/10">
                            <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 bg-[#ebbd34]/20">
                              <User className="w-6 h-6 text-[#ebbd34]" />
                            </div>
                            <p className="mt-2 text-sm font-medium text-[#ebbd34]">Bubble Veteran</p>
                            <p className="text-xs text-gray-500">Reached level 3</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            ) : (
              // Profile Edit Mode
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold text-[#ebbd34]">Edit Profile</h1>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-6">
                  {user && profile && (
                    <>
                      <AvatarUpload 
                        currentAvatarUrl={profile.avatar_url}
                        userId={user.id}
                        username={profile.username}
                        displayName={profile.display_name}
                        onAvatarUpdated={handleAvatarUpdate}
                      />
                      
                      <ProfileForm 
                        userId={user.id}
                        initialUsername={profile.username}
                        initialDisplayName={profile.display_name || ""}
                        avatarUrl={profile.avatar_url}
                        onCancel={() => setIsEditing(false)}
                      />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
