
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings, ChevronLeft, LogOut, Calendar, Activity, MessageCircle, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import NavigationBar from "@/components/bubbleWorld/NavigationBar";
import ProfileForm from "@/components/profile/ProfileForm";
import AvatarUpload from "@/components/profile/AvatarUpload";
import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const { user, signOut, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Add state for search functionality
  const [searchQuery, setSearchQuery] = useState("");
  
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
          className="bg-white rounded-2xl shadow-md overflow-hidden"
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
                <div className="w-5"></div> {/* Empty space for alignment */}
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
      </main>
    </div>
  );
};

export default Profile;
