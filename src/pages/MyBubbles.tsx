
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BubbleData } from "@/types/bubble";
import { Search, User, TrendingUp, Sparkles } from "lucide-react";
import BubbleWorld from "@/components/BubbleWorld";

const MyBubbles = () => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: bubbles = [] } = useQuery({
    queryKey: ['bubbles', 'my-all'],
    queryFn: async () => {
      // Get bubbles created by user
      const { data: createdBubbles, error: createdError } = await supabase
        .from('bubbles')
        .select('*')
        .eq('username', '@user');
      
      if (createdError) throw createdError;

      // Get reflected bubbles
      const { data: reflects, error: reflectsError } = await supabase
        .from('reflects')
        .select('bubble_id')
        .eq('username', '@user');
      
      if (reflectsError) throw reflectsError;

      const reflectedBubbleIds = reflects.map(r => r.bubble_id);
      
      let reflectedBubbles: any[] = [];
      if (reflectedBubbleIds.length > 0) {
        const { data: reflectedData, error: reflectedError } = await supabase
          .from('bubbles')
          .select('*')
          .in('id', reflectedBubbleIds)
          .not('username', 'eq', '@user');
        
        if (reflectedError) throw reflectedError;
        reflectedBubbles = reflectedData || [];
      }

      // Combine and deduplicate bubbles
      const allBubbles = [...(createdBubbles || []), ...reflectedBubbles];
      const uniqueBubbles = Array.from(new Map(allBubbles.map(b => [b.id, b])).values());

      return uniqueBubbles.map(bubble => ({
        ...bubble,
        size: bubble.size as "sm" | "md" | "lg"
      })) as BubbleData[];
    }
  });

  const handleBubbleClick = (id: string) => {
    console.log('Bubble clicked:', id);
    // Handle bubble click - can be expanded later
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
      
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-light text-primary mb-2">
            My Bubbles
          </h1>
          <p className="text-primary/60">
            Bubbles you've created or reflected upon
          </p>
          <div className="h-px w-24 bg-primary/20 mx-auto mt-4" />
        </div>

        <div className="relative h-[600px] mx-auto">
          <BubbleWorld
            topics={bubbles}
            onBubbleClick={handleBubbleClick}
          />
        </div>
      </main>
    </div>
  );
};

export default MyBubbles;
