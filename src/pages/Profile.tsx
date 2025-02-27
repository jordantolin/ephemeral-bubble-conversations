
import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, User, TrendingUp, Sparkles, Trophy, Star, Edit, LogOut, Save, Sparkle, Upload, Loader2 } from "lucide-react";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FormData {
  display_name: string;
  username: string;
  avatar_url: string | null;
}

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
  const [formData, setFormData] = useState<FormData>({
    display_name: "",
    username: "",
    avatar_url: null
  });
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Set initial form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || "",
        username: profile.username || "",
        avatar_url: profile.avatar_url || null
      });
      // Set preview image from profile
      setPreviewImage(profile.avatar_url);
    }
  }, [profile]);

  // Function to check if storage buckets exist and create them if needed
  const ensureStorageBucketsExist = async () => {
    try {
      // Check if the avatars bucket exists
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error("Error checking buckets:", bucketsError);
        return false;
      }
      
      const avatarBucketExists = buckets?.some(bucket => bucket.name === 'avatars');
      
      if (!avatarBucketExists) {
        console.log("Creating avatars bucket");
        const { error: createError } = await supabase.storage.createBucket('avatars', {
          public: true,
          fileSizeLimit: 1024 * 1024 * 2 // 2MB limit
        });
        
        if (createError) {
          console.error("Error creating avatars bucket:", createError);
          return false;
        }
        
        console.log("Avatars bucket created successfully");
      }
      
      return true;
    } catch (error) {
      console.error("Storage bucket check failed:", error);
      return false;
    }
  };

  // Handle avatar upload with improved error handling and feedback
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file || !user) {
        console.error("No file selected or user not logged in");
        return;
      }

      setIsUploading(true);

      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 2MB",
          variant: "destructive"
        });
        setIsUploading(false);
        return;
      }

      // Set preview image immediately for better UX
      const objectUrl = URL.createObjectURL(file);
      setPreviewImage(objectUrl);

      // Make sure storage buckets exist
      const bucketsExist = await ensureStorageBucketsExist();
      if (!bucketsExist) {
        toast({
          title: "Storage error",
          description: "Could not access storage. Please try again later.",
          variant: "destructive"
        });
        setIsUploading(false);
        return;
      }

      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`;
      const filePath = fileName;

      console.log("Uploading file to avatars bucket, path:", filePath);

      // First check if an old avatar exists and remove it
      if (formData.avatar_url) {
        try {
          const oldFileName = formData.avatar_url.split('/').pop();
          if (oldFileName && oldFileName.startsWith('avatar_')) {
            console.log("Removing old avatar:", oldFileName);
            await supabase.storage
              .from('avatars')
              .remove([oldFileName]);
          }
        } catch (error) {
          console.warn("Error removing old avatar:", error);
          // Continue with upload even if removing old avatar fails
        }
      }

      // Upload image to storage
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type 
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = publicUrlData?.publicUrl;
      
      console.log("File uploaded, public URL:", avatarUrl);

      // Update form data with new avatar URL
      setFormData(prev => ({
        ...prev,
        avatar_url: avatarUrl
      }));

      toast({
        title: "Avatar uploaded",
        description: "Your profile picture has been updated",
      });
    } catch (error: any) {
      console.error("Upload process error:", error);
      // Revert preview image on error
      setPreviewImage(formData.avatar_url);
      toast({
        title: "Upload failed",
        description: error.message || "There was a problem uploading your image",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Trigger file input click when avatar is clicked
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      // Basic form validation
      if (!formData.username || !formData.display_name) {
        toast({
          title: "Missing information",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      // Update the profile record
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: formData.display_name,
          username: formData.username,
          avatar_url: formData.avatar_url,
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
          console.error("Error updating profile:", error);
          throw error;
        }
        return;
      }

      // Update profile metadata in auth
      await supabase.auth.updateUser({
        data: {
          username: formData.username,
          display_name: formData.display_name,
          avatar_url: formData.avatar_url
        }
      });

      // Refresh profile data
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully"
      });
      
      setIsEditing(false);
    } catch (error: any) {
      console.error("Profile update error:", error);
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
    
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }

    return "BT";
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-secondary/20">
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
                      {profile?.display_name || user?.email?.split('@')[0] || "User"}
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
                            <Link key={bubble.id} to="/" onClick={() => {
                              // Store the bubble ID to be opened when the user navigates to the index page
                              localStorage.setItem('openBubbleId', bubble.id);
                            }}>
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
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setIsEditing(false);
                        // Reset form data to profile data
                        if (profile) {
                          setFormData({
                            display_name: profile.display_name || "",
                            username: profile.username || "",
                            avatar_url: profile.avatar_url || null
                          });
                          // Reset preview image
                          setPreviewImage(profile.avatar_url);
                        }
                      }}
                      className="border-[#ebbd34]/20 text-[#ebbd34] hover:bg-[#ebbd34]/5"
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm"
                      onClick={handleSaveProfile}
                      className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white gap-1.5"
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      <span>Save</span>
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-6">
                  <div className="flex flex-col items-center gap-2">
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={isUploading}
                    />
                    
                    {/* Avatar with upload overlay */}
                    <div className="relative cursor-pointer group" onClick={triggerFileInput}>
                      <Avatar className="w-24 h-24 border-4 border-[#ebbd34] group-hover:opacity-80 transition-opacity overflow-hidden">
                        {isUploading ? (
                          <div className="h-full w-full flex items-center justify-center bg-[#ebbd34]/10">
                            <Loader2 className="w-8 h-8 text-[#ebbd34] animate-spin" />
                          </div>
                        ) : (
                          <>
                            <AvatarImage 
                              src={previewImage || undefined} 
                              alt={formData.display_name || "Profile"} 
                              className="object-cover"
                            />
                            <AvatarFallback className="bg-[#ebbd34] text-white">
                              {getAvatarFallback()}
                            </AvatarFallback>
                          </>
                        )}
                      </Avatar>
                      
                      {/* Upload overlay */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                        <Upload className="h-5 w-5 mb-1" />
                        {isUploading ? "Uploading..." : "Change Photo"}
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-500 text-center mt-1 max-w-[150px]">
                      Click the avatar to upload a new profile picture
                    </p>
                  </div>
                  
                  <div className="w-full space-y-4">
                    <div>
                      <Label htmlFor="display_name" className="text-[#ebbd34]">Display Name</Label>
                      <Input
                        id="display_name"
                        name="display_name"
                        value={formData.display_name}
                        onChange={handleInputChange}
                        placeholder="Your name"
                        className="mt-1 border-[#ebbd34]/20"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="username" className="text-[#ebbd34]">Username</Label>
                      <Input
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        placeholder="username"
                        className="mt-1 border-[#ebbd34]/20"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">This will be used as your @username</p>
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
