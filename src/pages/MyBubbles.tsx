
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BubbleData } from "@/types/bubble";
import { Search, User, TrendingUp, Sparkles, Star } from "lucide-react";

interface BubblePhysics {
  element: HTMLElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
}

const MyBubbles = () => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const bubblesRef = useRef<{ [key: string]: BubblePhysics }>({});
  
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
    const containerRadius = Math.min(centerX, centerY) - 100;

    // Initialize bubble physics
    bubbles.forEach((bubble) => {
      if (!bubblesRef.current[bubble.id]) {
        const element = container.querySelector(`[data-bubble-id="${bubble.id}"]`) as HTMLElement;
        const radius = Math.max(40, bubble.reflect_count * 4 + 40); // Adjust size calculation
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * containerRadius * 0.5;
        
        bubblesRef.current[bubble.id] = {
          element,
          x: centerX + Math.cos(angle) * distance,
          y: centerY + Math.sin(angle) * distance,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          radius,
          mass: radius / 20
        };
      }
    });

    const animate = () => {
      const bubblePhysics = Object.values(bubblesRef.current);
      
      // Update positions with physics
      bubblePhysics.forEach(bubble => {
        // Add gentle floating effect
        bubble.vy += (Math.sin(Date.now() / 2000) * 0.02);
        bubble.vx += (Math.cos(Date.now() / 2000) * 0.02);
        
        // Apply velocity with damping
        bubble.x += bubble.vx * 0.99;
        bubble.y += bubble.vy * 0.99;
        
        // Contain within circle
        const dx = bubble.x - centerX;
        const dy = bubble.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance + bubble.radius > containerRadius) {
          const angle = Math.atan2(dy, dx);
          const bounceX = centerX + Math.cos(angle) * (containerRadius - bubble.radius);
          const bounceY = centerY + Math.sin(angle) * (containerRadius - bubble.radius);
          
          // Bounce off the container wall
          bubble.x = bounceX;
          bubble.y = bounceY;
          
          // Reflect velocity with some energy loss
          const normalX = dx / distance;
          const normalY = dy / distance;
          const dotProduct = bubble.vx * normalX + bubble.vy * normalY;
          bubble.vx = (bubble.vx - 2 * dotProduct * normalX) * 0.8;
          bubble.vy = (bubble.vy - 2 * dotProduct * normalY) * 0.8;
        }

        // Bubble collisions
        bubblePhysics.forEach(otherBubble => {
          if (bubble === otherBubble) return;

          const dx = otherBubble.x - bubble.x;
          const dy = otherBubble.y - bubble.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDist = bubble.radius + otherBubble.radius;

          if (distance < minDist) {
            // Collision response
            const angle = Math.atan2(dy, dx);
            const targetX = bubble.x + Math.cos(angle) * minDist;
            const targetY = bubble.y + Math.sin(angle) * minDist;
            
            const ax = (targetX - otherBubble.x) * 0.05;
            const ay = (targetY - otherBubble.y) * 0.05;
            
            bubble.vx -= ax * otherBubble.mass / bubble.mass;
            bubble.vy -= ay * otherBubble.mass / bubble.mass;
            otherBubble.vx += ax * bubble.mass / otherBubble.mass;
            otherBubble.vy += ay * bubble.mass / otherBubble.mass;
          }
        });

        // Update bubble position
        bubble.element.style.transform = `translate(${bubble.x - bubble.radius}px, ${bubble.y - bubble.radius}px)`;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
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
          className="relative w-[600px] h-[600px] mx-auto bg-white/50 rounded-full shadow-inner backdrop-blur-sm"
        >
          {/* Circle container with gradient border */}
          <div className="absolute inset-4 rounded-full border-4 border-primary/10" />
          
          {bubbles.map((bubble) => (
            <div
              key={bubble.id}
              data-bubble-id={bubble.id}
              className="bubble absolute cursor-pointer transform-gpu"
              style={{
                width: `${Math.max(80, bubble.reflect_count * 8 + 80)}px`,
                height: `${Math.max(80, bubble.reflect_count * 8 + 80)}px`,
                willChange: 'transform',
              }}
            >
              <div 
                className="h-full w-full rounded-full flex flex-col items-center justify-center p-2"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, rgba(235, 201, 66, 0.95) 0%, rgba(230, 180, 23, 0.85) 100%)',
                  backdropFilter: 'blur(4px)',
                  boxShadow: `
                    inset 2px 2px 4px rgba(255, 255, 255, 0.6),
                    inset -2px -2px 4px rgba(0, 0, 0, 0.1),
                    0 4px 8px rgba(0, 0, 0, 0.1),
                    0 8px 16px rgba(235, 201, 66, 0.3)
                  `,
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  transform: 'translateZ(0)'
                }}
              >
                <div className="absolute inset-0 rounded-full"
                     style={{
                       background: 'radial-gradient(circle at 70% 70%, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%)',
                     }} />
                <h3 className="text-white font-medium mb-1 text-sm line-clamp-2 text-center px-2 relative z-10">
                  {bubble.name}
                </h3>
                <div className="flex items-center space-x-1 text-white/90 relative z-10">
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
