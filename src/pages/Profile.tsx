import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings, ChevronLeft, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/bubbleWorld/NavigationBar";
import ProfileForm from "@/components/profile/ProfileForm";
import AvatarUpload from "@/components/profile/AvatarUpload";

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
      
      <main className="container max-w-3xl mx-auto px-4 pt-24 pb-12">
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
                            {/* We would fetch this from messages count */}
                            0
                          </p>
                          <p className="text-xs text-gray-600">Messages Sent</p>
                        </div>
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
