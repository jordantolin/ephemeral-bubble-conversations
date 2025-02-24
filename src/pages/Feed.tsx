
import MainNav from "@/components/MainNav";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BubbleData } from "@/types/bubble";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star } from "lucide-react";

const Feed = () => {
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
      <MainNav />
      
      <main className="container mx-auto px-4 py-8">
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
