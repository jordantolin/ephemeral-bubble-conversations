
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
          .not('username', 'eq', '@user'); // Exclude bubbles already included in createdBubbles
        
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

  useEffect(() => {
    if (!containerRef.current || !bubbles.length) return;

    const container = containerRef.current;
    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;
    const baseRadius = Math.min(centerX, centerY) - 100;

    // Initialize random positions and velocities for each bubble
    bubbles.forEach((bubble, index) => {
      if (!bubblesRef.current[bubble.id]) {
        const angle = (index / bubbles.length) * Math.PI * 2;
        bubblesRef.current[bubble.id] = {
          element: container.querySelector(`[data-bubble-id="${bubble.id}"]`) as HTMLElement,
          offset: Math.random() * Math.PI * 2,
          speed: 0.0003 + Math.random() * 0.0002
        };
      }
    });

    const animate = () => {
      const time = Date.now() / 1000; // Convert to seconds for smoother animation
      
      Object.entries(bubblesRef.current).forEach(([id, bubbleData], index) => {
        if (!bubbleData.element) return;

        // Calculate floating motion
        const angle = (index / bubbles.length) * Math.PI * 2;
        const radiusVariation = Math.sin(time * bubbleData.speed + bubbleData.offset) * 30;
        const radius = baseRadius * 0.6 + radiusVariation;
        
        // Add orbital and floating motion
        const orbitX = Math.cos(time * bubbleData.speed + angle) * radius;
        const orbitY = Math.sin(time * bubbleData.speed + angle) * radius;
        
        // Add floating effect
        const floatX = Math.sin(time * bubbleData.speed * 2 + bubbleData.offset) * 20;
        const floatY = Math.cos(time * bubbleData.speed * 3 + bubbleData.offset) * 20;
        
        const x = centerX + orbitX + floatX - bubbleData.element.clientWidth / 2;
        const y = centerY + orbitY + floatY - bubbleData.element.clientHeight / 2;

        bubbleData.element.style.transform = `translate(${x}px, ${y}px)`;
        bubbleData.element.style.transition = 'transform 0.2s ease-out';
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (container) {
        const newCenterX = container.clientWidth / 2;
        const newCenterY = container.clientHeight / 2;
        Object.values(bubblesRef.current).forEach(bubbleData => {
          if (bubbleData.element) {
            const x = newCenterX - bubbleData.element.clientWidth / 2;
            const y = newCenterY - bubbleData.element.clientHeight / 2;
            bubbleData.element.style.transform = `translate(${x}px, ${y}px)`;
          }
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
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
            My Bubbles
          </h1>
          <p className="text-primary/60">
            Bubbles you've created or reflected upon
          </p>
          <div className="h-px w-24 bg-primary/20 mx-auto mt-4" />
        </div>

        <div 
          ref={containerRef}
          className="relative w-[600px] h-[600px] mx-auto bg-white/50 rounded-full shadow-inner"
        >
          {/* Circle container with gradient border */}
          <div className="absolute inset-4 rounded-full border-4 border-primary/10 backdrop-blur-sm" />
          
          {bubbles.map((bubble) => (
            <div
              key={bubble.id}
              data-bubble-id={bubble.id}
              className="bubble absolute p-4 cursor-pointer transform transition-all duration-300 hover:scale-110"
              style={{
                width: `${Math.max(80, bubble.reflect_count * 8 + 80)}px`,
                height: `${Math.max(80, bubble.reflect_count * 8 + 80)}px`,
              }}
            >
              <div 
                className="h-full w-full rounded-full bg-[#ebc942] flex flex-col items-center justify-center p-2 shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #ebc942 0%, #e6b417 100%)',
                }}
              >
                <h3 className="text-primary-foreground font-medium mb-1 text-sm line-clamp-2 text-center">
                  {bubble.name}
                </h3>
                <div className="flex items-center space-x-1 text-primary-foreground/80">
                  <Star className="w-3 h-3" />
                  <span className="text-xs">{bubble.reflect_count}</span>
                </div>
              </div>
            </div>
          ))}

          {bubbles.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-primary/40 text-lg">No bubbles yet</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MyBubbles;
