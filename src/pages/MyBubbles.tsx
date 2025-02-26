
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BubbleData } from "@/types/bubble";
import { Search, User, TrendingUp, Sparkles } from "lucide-react";
import BubbleWorld from "@/components/BubbleWorld";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const MyBubbles = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBubble, setSelectedBubble] = useState<BubbleData | null>(null);
  
  const { data: bubbles = [] } = useQuery({
    queryKey: ['bubbles', 'my-72h'],
    queryFn: async () => {
      const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
      const { data: recentBubbles, error: recentError } = await supabase
        .from('bubbles')
        .select('*')
        .gte('created_at', threeDaysAgo)
        .order('created_at', { ascending: false });
      
      if (recentError) throw recentError;

      return recentBubbles.map(bubble => ({
        ...bubble,
        size: bubble.size as "sm" | "md" | "lg"
      })) as BubbleData[];
    }
  });

  const handleBubbleClick = (bubbleId: string) => {
    const bubble = bubbles.find(b => b.id === bubbleId);
    if (bubble) {
      if (bubble.expires_at && new Date(bubble.expires_at) <= new Date()) {
        setSelectedBubble(bubble);
      } else {
        navigate(`/chat/${bubble.id}`);
      }
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC]">
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
                className="p-2 hover:bg-[#ebbd34]/5 rounded-full text-[#ebbd34] transition-colors"
              >
                <User className="w-5 h-5" />
              </Link>
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
      
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 mt-16">
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-light text-[#ebbd34] mb-2">
            Recent Bubbles
          </h1>
          <p className="text-sm sm:text-base text-[#ebbd34]/60">
            All bubbles created in the last 72 hours
          </p>
          <div className="h-px w-16 sm:w-24 bg-[#ebbd34]/20 mx-auto mt-3 sm:mt-4" />
        </div>

        <div className="relative h-[400px] sm:h-[600px] w-full max-w-[800px] mx-auto">
          {bubbles && bubbles.length > 0 && (
            <BubbleWorld 
              topics={bubbles.map(bubble => ({
                ...bubble,
                username: bubble.username || "Anonymous"
              }))} 
              onBubbleClick={handleBubbleClick}
            />
          )}
        </div>

        <Dialog open={!!selectedBubble} onOpenChange={() => setSelectedBubble(null)}>
          <DialogContent className="sm:max-w-[425px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl text-[#ebbd34]">
                {selectedBubble?.name}
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base text-[#ebbd34]/70">
                {selectedBubble?.expires_at && new Date(selectedBubble.expires_at) <= new Date() 
                  ? "This bubble has already exploded"
                  : selectedBubble?.description || "This bubble is still active"}
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default MyBubbles;
