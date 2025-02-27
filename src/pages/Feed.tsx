
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BubbleData } from "@/types/bubble";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, User, TrendingUp, Sparkles, Star } from "lucide-react";

const Feed = () => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: bubbles = [] } = useQuery({
    queryKey: ['bubbles', 'top-reflected'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bubbles')
        .select('*')
        .order('reflect_count', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      return data.map(bubble => ({
        ...bubble,
        size: bubble.size as "sm" | "md" | "lg"
      })) as BubbleData[];
    }
  });

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
      
      <main className="container mx-auto px-4 pt-28 sm:pt-20 pb-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-light text-primary mb-2">
            Top Bubbles
          </h1>
          <div className="h-px w-24 bg-primary/20 mx-auto" />
        </div>

        <ScrollArea className="h-[calc(100vh-200px)] w-full max-w-2xl mx-auto rounded-xl">
          <div className="space-y-8 p-4">
            {bubbles.map((bubble) => (
              <div 
                key={bubble.id}
                className="relative w-full aspect-square max-w-[200px] mx-auto animate-float-slow"
              >
                <div className="absolute inset-0 bg-[#ebc942] rounded-full flex items-center justify-center p-6 hover:scale-105 transition-transform">
                  <div className="text-center">
                    <h3 className="text-primary-foreground font-medium mb-1">
                      {bubble.name}
                    </h3>
                    <p className="text-xs text-primary-foreground/80 mb-2">
                      {bubble.topic}
                    </p>
                    <div className="flex items-center justify-center space-x-1 text-primary-foreground">
                      <Star className="w-4 h-4" />
                      <span className="text-sm">{bubble.reflect_count}</span>
                    </div>
                    <p className="mt-2 text-xs text-primary-foreground/80">
                      by {bubble.username}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
};

export default Feed;
