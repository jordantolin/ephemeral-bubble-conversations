
import MainNav from "@/components/MainNav";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BubbleData } from "@/types/bubble";
import { Star } from "lucide-react";
import { useEffect, useRef } from "react";

const MyBubbles = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  
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
      const radius = Math.min(centerX, centerY) - 100; // Smaller radius to keep bubbles inside

      Array.from(bubbleElements).forEach((bubble, index) => {
        const element = bubble as HTMLElement;
        const angle = (index / bubbleElements.length) * Math.PI * 2;
        
        // Add some random variation to make it more organic
        const randomRadius = radius * (0.7 + Math.random() * 0.3);
        const x = centerX + Math.cos(angle) * randomRadius - element.clientWidth / 2;
        const y = centerY + Math.sin(angle) * randomRadius - element.clientHeight / 2;

        element.style.transform = `translate(${x}px, ${y}px)`;
      });
    };

    updatePositions();
    window.addEventListener('resize', updatePositions);

    return () => {
      window.removeEventListener('resize', updatePositions);
    };
  }, [bubbles]);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC]">
      <MainNav />
      
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
              className="bubble absolute bg-[#ebc942] rounded-full p-4 hover:scale-105 transition-transform duration-300 ease-out animate-float-slow"
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
