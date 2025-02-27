
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, User, ArrowLeft, Sparkle } from "lucide-react";
import Feed3DContainer from "@/components/feed/Feed3DContainer";
import { BubbleData } from "@/types/bubble";
import { useToast } from "@/hooks/use-toast";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Feed = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const [activeBubbleId, setActiveBubbleId] = useState<string | null>(null);

  // Fetch trending bubbles
  const { data: bubbles = [], isLoading: isLoadingBubbles } = useQuery({
    queryKey: ['trendingBubbles'],
    queryFn: async () => {
      try {
        // Fetch bubbles ordered by reflect_count
        const { data, error } = await supabase
          .from('bubbles')
          .select('*')
          .order('reflect_count', { ascending: false })
          .limit(20);
          
        if (error) throw error;
        
        return data as BubbleData[];
      } catch (error: any) {
        console.error('Error fetching bubbles:', error);
        toast({
          title: "Error loading feed",
          description: error.message || "Could not load bubbles",
          variant: "destructive"
        });
        return [];
      }
    }
  });

  // Handle bubble selection
  const handleBubbleClick = (id: string) => {
    setActiveBubbleId(id);
    // Navigate to detailed view or open dialog
    navigate(`/feed?bubbleId=${id}`);
  };

  console.log("Feed rendering with bubbles:", bubbles);

  return (
    <div className="min-h-screen w-full overflow-hidden bg-gradient-to-b from-[#1a1a1a] to-[#121212]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/30 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto">
          <div className="flex items-center justify-between h-16 px-4">
            {/* Logo and Back Button */}
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2">
                <ArrowLeft className="w-5 h-5 text-white" />
                <span className="text-white font-medium">Back to World</span>
              </Link>
            </div>

            {/* Nav Icons */}
            <div className="flex items-center gap-1">
              <Link 
                to="/my-bubbles" 
                className="nav-link flex items-center gap-2 px-4 py-2 rounded-full text-white hover:bg-white/10 transition-colors"
              >
                <Sparkles className="w-5 h-5" />
              </Link>
              <Link 
                to="/feed" 
                className="nav-link flex items-center gap-2 px-4 py-2 rounded-full text-white bg-white/20 transition-colors"
              >
                <TrendingUp className="w-5 h-5" />
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="hover:bg-white/10 rounded-full text-white"
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
                  <Link to="/profile">
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      <span>My Profile</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link to="/">
                    <DropdownMenuItem>
                      <Sparkle className="mr-2 h-4 w-4" />
                      <span>Bubble World</span>
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuItem onClick={signOut}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Feed Area */}
      <div className="pt-16 h-[calc(100vh-4rem)]">
        {isLoadingBubbles ? (
          <div className="h-full w-full flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-white/10 border-t-[#ebbd34] rounded-full animate-spin"></div>
            <p className="text-white mt-4">Loading bubble feed...</p>
          </div>
        ) : bubbles.length === 0 ? (
          <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-4">
              <Sparkles className="w-10 h-10 text-[#ebbd34]" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">No bubbles found</h2>
            <p className="text-white/70 mb-6">Be the first to create a bubble and start a conversation!</p>
            <Button 
              onClick={() => navigate('/')}
              className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white"
            >
              Explore Bubble World
            </Button>
          </div>
        ) : (
          <div className="h-full">
            <Feed3DContainer 
              bubbles={bubbles} 
              onBubbleClick={handleBubbleClick} 
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Feed;
