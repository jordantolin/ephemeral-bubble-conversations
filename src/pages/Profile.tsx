
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, User, TrendingUp, Sparkles, Trophy, Star, Edit, LogOut, Save, Sparkle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const profileColors = [
  "#ebbd34", // Default gold
  "#3498db", // Blue
  "#2ecc71", // Green
  "#e74c3c", // Red
  "#9b59b6", // Purple
  "#1abc9c", // Teal
  "#f1c40f", // Yellow
  "#e67e22", // Orange
  "#34495e", // Dark blue
  "#ff6b81", // Pink
];

const avatarStyles = [
  "simple",
  "gradient",
  "pattern",
  "material",
  "neon"
];

const Profile = () => {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    display_name: "",
    username: "",
    bio: "",
    profile_color: profileColors[0],
    avatar_style: avatarStyles[0]
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Set initial form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || "",
        username: profile.username || "",
        bio: profile.bio || "",
        profile_color: profile.profile_color || profileColors[0],
        avatar_style: profile.avatar_style || avatarStyles[0]
      });
    }
  }, [profile]);

  // Fetch user's reflected bubbles
  const { data: reflectedBubbles = [] } = useQuery({
    queryKey: ['reflectedBubbles'],
    queryFn: async () => {
      if (!user) return [];

      const { data: reflects, error } = await supabase
        .from('reflects')
        .select('bubble_id')
        .eq('username', profile?.username || user.email);
      
      if (error) {
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
        toast({
          title: "Error fetching bubbles",
          description: bubblesError.message,
          variant: "destructive"
        });
        return [];
      }

      return bubbles;
    },
    enabled: !!user
  });

  // Get user stats from reflected bubbles
  const userStats = {
    totalReflects: reflectedBubbles.length,
    topTopics: getTopTopics(reflectedBubbles),
    level: Math.min(Math.floor(reflectedBubbles.length / 5) + 1, 10)
  };

  function getTopTopics(bubbles) {
    const topicCounts = {};
    bubbles.forEach(bubble => {
      topicCounts[bubble.topic] = (topicCounts[bubble.topic] || 0) + 1;
    });
    
    return Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([topic]) => topic);
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: formData.display_name,
          username: formData.username,
          bio: formData.bio,
          profile_color: formData.profile_color,
          avatar_style: formData.avatar_style,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Username already taken",
            description: "Please choose a different username",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        return;
      }

      // Update profile metadata in auth
      await supabase.auth.updateUser({
        data: {
          username: formData.username,
          display_name: formData.display_name
        }
      });

      queryClient.invalidateQueries({ queryKey: ['profile'] });
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully"
      });
      
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Generate avatar fallback
  const getAvatarFallback = () => {
    if (profile?.display_name) {
      const nameParts = profile.display_name.split(" ");
      if (nameParts.length >= 2) {
        return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
      }
      return profile.display_name.substring(0, 2).toUpperCase();
    }
    
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }

    return "BT";
  };

  // Generate avatar URL based on style and color
  const getAvatarUrl = () => {
    if (profile?.avatar_url) return profile.avatar_url;
    
    const style = formData.avatar_style || "simple";
    const color = formData.profile_color?.replace("#", "") || "ebbd34";
    const seed = profile?.username || user?.email?.split('@')[0] || "user";
    
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=${color}`;
  };

  // Apply custom styling based on profile color
  const profileColor = formData.profile_color || "#ebbd34";
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-secondary/20">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b" style={{ borderColor: `${profileColor}10` }}>
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
                <span className="text-xl font-semibold hidden sm:inline" style={{ color: profileColor }}>
                  Bubble Trouble
                </span>
              </Link>
              
              <div className="relative flex-1 max-w-md hidden sm:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: `${profileColor}70` }} />
                <input
                  type="search"
                  placeholder="Search bubbles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-full border-none focus:ring-2 focus:outline-none"
                  style={{ 
                    backgroundColor: `${profileColor}05`,
                    color: profileColor,
                    '::placeholder': { color: `${profileColor}50` },
                    focusRing: `${profileColor}20`
                  }}
                />
              </div>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center gap-1">
              <Link 
                to="/my-bubbles" 
                className={`nav-link flex items-center gap-2 px-4 py-2 rounded-full hover:bg-opacity-5 transition-colors ${
                  location.pathname === '/my-bubbles' ? 'bg-opacity-10' : ''
                }`}
                style={{ 
                  color: profileColor,
                  backgroundColor: location.pathname === '/my-bubbles' ? `${profileColor}10` : 'transparent',
                  '&:hover': { backgroundColor: `${profileColor}05` }
                }}
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">My Bubbles</span>
              </Link>
              <Link 
                to="/feed" 
                className={`nav-link flex items-center gap-2 px-4 py-2 rounded-full hover:bg-opacity-5 transition-colors ${
                  location.pathname === '/feed' ? 'bg-opacity-10' : ''
                }`}
                style={{ 
                  color: profileColor,
                  backgroundColor: location.pathname === '/feed' ? `${profileColor}10` : 'transparent',
                  '&:hover': { backgroundColor: `${profileColor}05` }
                }}
              >
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Feed</span>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="hover:bg-opacity-5 rounded-full"
                    style={{ 
                      color: profileColor,
                      '&:hover': { backgroundColor: `${profileColor}05` }
                    }}
                  >
                    <User className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white z-[100]">
                  <DropdownMenuItem className="flex flex-col items-start p-3">
                    <span className="font-medium" style={{ color: profileColor }}>
                      {profile?.display_name || user?.email}
                    </span>
                    <span className="text-xs text-gray-500">
                      @{profile?.username || user?.email?.split('@')[0]}
                    </span>
                  </DropdownMenuItem>
                  <Link to="/">
                    <DropdownMenuItem>
                      <Sparkle className="mr-2 h-4 w-4" />
                      <span>Bubble World</span>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: `${profileColor}70` }} />
            <input
              type="search"
              placeholder="Search bubbles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full border-none focus:ring-2 focus:outline-none text-sm"
              style={{ 
                backgroundColor: `${profileColor}05`,
                color: profileColor,
                '::placeholder': { color: `${profileColor}50` },
                focusRing: `${profileColor}20`
              }}
            />
          </div>
        </div>
      </nav>
      
      <main className="container mx-auto px-4 pt-28 sm:pt-24 pb-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-sm" style={{ borderColor: `${profileColor}10` }}>
            {!isEditing ? (
              // Profile View Mode
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-2xl font-bold" style={{ color: profileColor }}>My Profile</h1>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="gap-1.5"
                    style={{ 
                      borderColor: `${profileColor}20`,
                      color: profileColor
                    }}
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit Profile</span>
                  </Button>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <Avatar className="w-24 h-24 border-4" style={{ borderColor: profileColor }}>
                    <AvatarImage src={getAvatarUrl()} alt={profile?.display_name || "Profile"} />
                    <AvatarFallback style={{ backgroundColor: profileColor }}>{getAvatarFallback()}</AvatarFallback>
                  </Avatar>
                  
                  <div className="text-center sm:text-left">
                    <h1 className="text-3xl font-bold" style={{ color: profileColor }}>
                      {profile?.display_name || user?.email?.split('@')[0] || "User"}
                    </h1>
                    <p className="text-gray-500 mt-1">
                      @{profile?.username || user?.email?.split('@')[0] || "user"}
                    </p>
                    
                    {profile?.bio && (
                      <p className="mt-3 text-gray-700">{profile.bio}</p>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-2 mt-4">
                      <Badge variant="outline" className="flex items-center gap-1" style={{ borderColor: `${profileColor}30`, color: profileColor }}>
                        <Trophy className="w-3 h-3" />
                        <span>Level {userStats.level}</span>
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1" style={{ borderColor: `${profileColor}30`, color: profileColor }}>
                        <Star className="w-3 h-3" />
                        <span>{userStats.totalReflects} Reflects</span>
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <Tabs defaultValue="bubbles" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4" style={{ backgroundColor: `${profileColor}10` }}>
                      <TabsTrigger value="bubbles" style={{ color: profileColor, '&[data-state=active]': { backgroundColor: `${profileColor}20` } }}>My Reflected Bubbles</TabsTrigger>
                      <TabsTrigger value="badges" style={{ color: profileColor, '&[data-state=active]': { backgroundColor: `${profileColor}20` } }}>Badges & Achievements</TabsTrigger>
                    </TabsList>

                    <TabsContent value="bubbles">
                      {reflectedBubbles.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${profileColor}10` }}>
                            <Sparkles className="w-8 h-8" style={{ color: profileColor }} />
                          </div>
                          <h3 className="text-lg font-medium" style={{ color: profileColor }}>No reflected bubbles yet</h3>
                          <p className="text-gray-500 mt-2">Explore the bubble world and reflect on topics that interest you!</p>
                          <Link to="/">
                            <Button className="mt-4" style={{ backgroundColor: profileColor, color: 'white', '&:hover': { backgroundColor: `${profileColor}90` } }}>
                              Explore Bubbles
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {reflectedBubbles.map((bubble) => (
                            <Link key={bubble.id} to="/" onClick={() => {
                              // Store the bubble ID to be opened when the user navigates to the index page
                              localStorage.setItem('openBubbleId', bubble.id);
                            }}>
                              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-lg" style={{ color: profileColor }}>{bubble.name}</CardTitle>
                                  <CardDescription>{bubble.topic}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                  <p className="text-sm text-gray-600 line-clamp-2">{bubble.description || "No description"}</p>
                                </CardContent>
                                <CardFooter className="pt-0">
                                  <div className="w-full flex justify-between items-center">
                                    <Badge className="text-xs" style={{ backgroundColor: `${profileColor}10`, color: profileColor }}>
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
                          <div className="p-4 rounded-xl text-center" style={{ backgroundColor: `${profileColor}10` }}>
                            <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: `${profileColor}20` }}>
                              <Star className="w-6 h-6" style={{ color: profileColor }} />
                            </div>
                            <p className="mt-2 text-sm font-medium" style={{ color: profileColor }}>Bubble Explorer</p>
                            <p className="text-xs text-gray-500">Reflected your first bubble</p>
                          </div>
                        )}
                        
                        {userStats.totalReflects >= 5 && (
                          <div className="p-4 rounded-xl text-center" style={{ backgroundColor: `${profileColor}10` }}>
                            <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: `${profileColor}20` }}>
                              <Trophy className="w-6 h-6" style={{ color: profileColor }} />
                            </div>
                            <p className="mt-2 text-sm font-medium" style={{ color: profileColor }}>Reflection Master</p>
                            <p className="text-xs text-gray-500">Reflected 5+ bubbles</p>
                          </div>
                        )}
                        
                        {userStats.topTopics.length > 0 && (
                          <div className="p-4 rounded-xl text-center" style={{ backgroundColor: `${profileColor}10` }}>
                            <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: `${profileColor}20` }}>
                              <Sparkle className="w-6 h-6" style={{ color: profileColor }} />
                            </div>
                            <p className="mt-2 text-sm font-medium" style={{ color: profileColor }}>Topic Enthusiast</p>
                            <p className="text-xs text-gray-500">Favorite: {userStats.topTopics[0]}</p>
                          </div>
                        )}
                        
                        {userStats.level >= 3 && (
                          <div className="p-4 rounded-xl text-center" style={{ backgroundColor: `${profileColor}10` }}>
                            <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: `${profileColor}20` }}>
                              <User className="w-6 h-6" style={{ color: profileColor }} />
                            </div>
                            <p className="mt-2 text-sm font-medium" style={{ color: profileColor }}>Bubble Veteran</p>
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
                  <h1 className="text-2xl font-bold" style={{ color: profileColor }}>Edit Profile</h1>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsEditing(false)}
                      style={{ 
                        borderColor: `${profileColor}20`,
                        color: profileColor
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm"
                      onClick={handleSaveProfile}
                      style={{ 
                        backgroundColor: profileColor,
                        color: 'white',
                        '&:hover': { backgroundColor: `${profileColor}90` }
                      }}
                      className="gap-1.5"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save</span>
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-6">
                  <div className="flex flex-col items-center gap-2">
                    <Avatar className="w-24 h-24 border-4" style={{ borderColor: formData.profile_color }}>
                      <AvatarImage src={getAvatarUrl()} alt={formData.display_name || "Profile"} />
                      <AvatarFallback style={{ backgroundColor: formData.profile_color }}>
                        {getAvatarFallback()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="grid grid-cols-5 gap-1 mt-2">
                      {profileColors.map(color => (
                        <button
                          key={color}
                          type="button"
                          className={`w-6 h-6 rounded-full transition-all ${
                            formData.profile_color === color ? 'ring-2 ring-offset-2' : 'opacity-70 hover:opacity-100'
                          }`}
                          style={{ 
                            backgroundColor: color,
                            ringColor: color
                          }}
                          onClick={() => handleSelectChange('profile_color', color)}
                          aria-label={`Select ${color} as profile color`}
                        />
                      ))}
                    </div>
                    
                    <Select
                      value={formData.avatar_style}
                      onValueChange={(value) => handleSelectChange('avatar_style', value)}
                    >
                      <SelectTrigger className="w-full mt-2 text-xs h-8" style={{ borderColor: `${profileColor}20`, color: profileColor }}>
                        <SelectValue placeholder="Avatar Style" />
                      </SelectTrigger>
                      <SelectContent>
                        {avatarStyles.map(style => (
                          <SelectItem key={style} value={style} className="capitalize">
                            {style}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="w-full space-y-4">
                    <div>
                      <Label htmlFor="display_name" style={{ color: profileColor }}>Display Name</Label>
                      <Input
                        id="display_name"
                        name="display_name"
                        value={formData.display_name}
                        onChange={handleInputChange}
                        placeholder="Your name"
                        className="mt-1"
                        style={{ borderColor: `${profileColor}20` }}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="username" style={{ color: profileColor }}>Username</Label>
                      <Input
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        placeholder="username"
                        className="mt-1"
                        style={{ borderColor: `${profileColor}20` }}
                      />
                      <p className="text-xs text-gray-500 mt-1">This will be used as your @username</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="bio" style={{ color: profileColor }}>Bio</Label>
                      <Input
                        id="bio"
                        name="bio"
                        value={formData.bio || ""}
                        onChange={handleInputChange}
                        placeholder="Tell us about yourself"
                        className="mt-1"
                        style={{ borderColor: `${profileColor}20` }}
                      />
                    </div>
                  </div>
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
