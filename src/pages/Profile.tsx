
import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, User, TrendingUp, Sparkles, Trophy, Star, LogOut } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { user, userProfile, signOut, loading } = useUser();
  const { toast } = useToast();

  // Redirect to auth page if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Fetch user's reflected bubbles
  const { data: reflectedBubbles = [] } = useQuery({
    queryKey: ['reflectedBubbles', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: reflects, error: reflectsError } = await supabase
        .from('reflects')
        .select('bubble_id')
        .eq('username', user.id);

      if (reflectsError) {
        toast({
          title: "Error fetching reflects",
          description: reflectsError.message,
          variant: "destructive"
        });
        return [];
      }

      if (reflects.length === 0) return [];

      const bubbleIds = reflects.map(r => r.bubble_id);

      const { data: bubbles, error: bubblesError } = await supabase
        .from('bubbles')
        .select('*')
        .in('id', bubbleIds)
        .gte('expires_at', new Date().toISOString());

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
    enabled: !!user,
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC]">
        <div className="w-16 h-16 rounded-full border-4 border-[#ebbd34] border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return null; // This shouldn't happen as we redirect, but just in case
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FEF7E4] to-[#FFF9EC]">
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
                <span className="text-xl font-semibold text-[#ebbd34] hidden sm:inline">
                  Bubble Trouble
                </span>
              </Link>
              
              <div className="relative flex-1 max-w-md hidden sm:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#ebbd34]/70 w-4 h-4" />
                <input
                  type="search"
                  placeholder="Search bubbles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-full bg-[#ebbd34]/5 border-none text-[#ebbd34] placeholder-[#ebbd34]/50 focus:ring-2 focus:ring-[#ebbd34]/20 focus:outline-none"
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
              <Link 
                to="/profile" 
                className={`p-2 hover:bg-[#ebbd34]/5 rounded-full text-[#ebbd34] transition-colors ${
                  location.pathname === '/profile' ? 'bg-[#ebbd34]/10' : ''
                }`}
              >
                <User className="w-5 h-5" />
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="text-[#ebbd34] hover:bg-[#ebbd34]/5"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="sm:hidden px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#ebbd34]/70 w-4 h-4" />
            <input
              type="search"
              placeholder="Search bubbles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full bg-[#ebbd34]/5 border-none text-[#ebbd34] placeholder-[#ebbd34]/50 focus:ring-2 focus:ring-[#ebbd34]/20 focus:outline-none"
            />
          </div>
        </div>
      </nav>
      
      <main className="container mx-auto px-4 pt-28 sm:pt-24 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/50 p-8 rounded-3xl shadow-lg border border-[#ebbd34]/10">
            <div className="flex items-center space-x-6">
              <Avatar className="w-24 h-24 border-2 border-[#ebbd34]/20">
                <AvatarImage src={userProfile.avatar_url || undefined} />
                <AvatarFallback className="bg-[#ebbd34]/20 text-[#ebbd34]">
                  {userProfile.display_name?.[0] || userProfile.username?.[0] || user.email?.[0]}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <h1 className="text-3xl font-bold text-[#ebbd34]">
                  {userProfile.display_name || userProfile.username}
                </h1>
                <p className="text-[#ebbd34]/70 mt-1">{user.email}</p>
                
                <div className="flex items-center space-x-4 mt-4">
                  <Badge variant="outline" className="flex items-center space-x-1 border-[#ebbd34]/20 text-[#ebbd34]">
                    <Star className="w-3 h-3" />
                    <span>{reflectedBubbles.length} Reflected Bubbles</span>
                  </Badge>
                </div>
              </div>
            </div>

            <div className="mt-12">
              <h2 className="text-xl font-semibold mb-6 text-[#ebbd34]">Your Reflected Bubbles</h2>
              
              {reflectedBubbles.length === 0 ? (
                <div className="text-center py-10 bg-[#ebbd34]/5 rounded-xl">
                  <Sparkles className="mx-auto h-12 w-12 text-[#ebbd34]/40" />
                  <p className="mt-4 text-[#ebbd34]/60">
                    You haven't reflected any bubbles yet!
                  </p>
                  <Button asChild className="mt-4 bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white">
                    <Link to="/">Explore Bubbles</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {reflectedBubbles.map((bubble) => (
                    <Link 
                      key={bubble.id} 
                      to="/"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate("/");
                        // We would ideally want to open the bubble dialog here
                        // but we'll let the Index page handle that
                      }}
                      className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-[#ebbd34]/80 to-[#ebbd34] p-6 shadow-md transition-all hover:shadow-lg hover:-translate-y-1"
                    >
                      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#ebbd34]/20 group-hover:bg-[#ebbd34]/30 transition-colors" />
                      
                      <h3 className="text-white font-semibold text-lg mb-2">{bubble.name}</h3>
                      <p className="text-white/90 text-sm">{bubble.topic}</p>
                      
                      <div className="mt-4 flex items-center gap-2">
                        <Star className="h-4 w-4 text-white" />
                        <span className="text-white/90 text-sm">{bubble.reflect_count} reflects</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
