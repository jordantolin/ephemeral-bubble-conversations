
import MainNav from "@/components/MainNav";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BubbleData } from "@/types/bubble";
import { Star } from "lucide-react";

const MyBubbles = () => {
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

        <div className="relative w-[600px] h-[600px] mx-auto">
          {bubbles.map((bubble, index) => {
            const angle = (index / bubbles.length) * Math.PI * 2;
            const radius = 250; // Circle radius
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            return (
              <div
                key={bubble.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-[#ebc942] rounded-full p-6 hover:shadow-lg transition-all duration-300 hover:scale-105 float-bubble-1"
                style={{
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`,
                  width: `${Math.max(100, bubble.reflect_count * 10 + 100)}px`,
                  height: `${Math.max(100, bubble.reflect_count * 10 + 100)}px`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  textAlign: 'center',
                }}
              >
                <h3 className="text-primary-foreground font-medium mb-1 text-sm">
                  {bubble.name}
                </h3>
                <div className="flex items-center space-x-1 text-primary-foreground/80">
                  <Star className="w-3 h-3" />
                  <span className="text-xs">{bubble.reflect_count}</span>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default MyBubbles;
