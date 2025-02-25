
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BubbleData } from "@/types/bubble";
import { Search, User, TrendingUp, Sparkles, Star } from "lucide-react";

const MyBubbles = () => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const bubblesRef = useRef<{ [key: string]: { element: HTMLElement; offset: number; speed: number } }>({});
  
  const { data: bubbles = [] } = useQuery({
    queryKey: ['bubbles', 'my-reflected'],
    queryFn: async () => {
      const { data: reflects, error: reflectsError } = await supabase
        .from('reflects')
        .select('bubble_id')
        .eq('username', '@user');
      
      if (reflectsError) throw reflectsError;

      const bubbleIds = reflects.map(r => r.bubble_id);
      
      if (bubbleIds.length === 0) return [];

      const { data, error } = await supabase
        .from('bubbles')
        .select('*')
        .in('id', bubbleIds);
      
      if (error) throw error;

      return data.map(bubble => ({
        ...bubble,
        size: bubble.size as "sm" | "md" | "lg"
      })) as BubbleData[];
    }
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const updatePositions = () => {
      const container = containerRef.current;
      if (!container) return;

      const bubbleElements = container.getElementsByClassName('bubble');
      const centerX = container.clientWidth / 2;
      const centerY = container.clientHeight / 2;
      const radius = Math.min(centerX, centerY) - 100;

      // Initialize bubble references if not already done
      Array.from(bubbleElements).forEach((bubble, index) => {
        const element = bubble as HTMLElement;
        if (!bubblesRef.current[element.dataset.bubbleId || '']) {
          bubblesRef.current[element.dataset.bubbleId || ''] = {
            element,
            offset: Math.random() * Math.PI * 2,
            speed: 0.0005 + Math.random() * 0.0005
          };
        }
      });

      // Animate bubbles
      const animate = () => {
        const time = Date.now();
        
        Object.values(bubblesRef.current).forEach((bubbleData, index) => {
          const baseAngle = (index / bubbleElements.length) * Math.PI * 2;
          const floatAngle = baseAngle + Math.sin(time * bubbleData.speed + bubbleData.offset) * 0.2;
          
          // Add some random variation to make it more organic
          const randomRadius = radius * (0.7 + Math.sin(time * bubbleData.speed * 2 + bubbleData.offset) * 0.1);
          const x = centerX + Math.cos(floatAngle) * randomRadius - bubbleData.element.clientWidth / 2;
          const y = centerY + Math.sin(floatAngle) * randomRadius - bubbleData.element.clientHeight / 2;

          bubbleData.element.style.transform = `translate(${x}px, ${y}px)`;
          bubbleData.element.style.transition = 'transform 0.5s ease-out';
        });

        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animate();
    };

    updatePositions();
    window.addEventListener('resize', updatePositions);

    return () => {
      window.removeEventListener('resize', updatePositions);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      bubblesRef.current = {};
    };
  }, [bubbles]);

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
            My Reflected Bubbles
          </h1>
          <div className="h-px w-24 bg-primary/20 mx-auto" />
        </div>

        <div 
          ref={containerRef}
          className="relative w-[600px] h-[600px] mx-auto"
        >
          {/* Circle container */}
          <div className="absolute inset-4 border-4 border-primary/20 rounded-full" />
          
          {bubbles.map((bubble) => (
            <div
              key={bubble.id}
              data-bubble-id={bubble.id}
              className="bubble absolute bg-[#ebc942] rounded-full p-4 hover:scale-105 transition-transform duration-300 ease-out animate-float-slow cursor-pointer"
              style={{
                width: `${Math.max(80, bubble.reflect_count * 8 + 80)}px`,
                height: `${Math.max(80, bubble.reflect_count * 8 + 80)}px`,
              }}
            >
              <div className="h-full w-full flex flex-col items-center justify-center">
                <h3 className="text-primary-foreground font-medium mb-1 text-sm line-clamp-2">
                  {bubble.name}
                </h3>
                <div className="flex items-center space-x-1 text-primary-foreground/80">
                  <Star className="w-3 h-3" />
                  <span className="text-xs">{bubble.reflect_count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default MyBubbles;
