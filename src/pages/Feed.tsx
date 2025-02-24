
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
          <div className="space-y-4 p-4">
            {bubbles.map((bubble) => (
              <div 
                key={bubble.id}
                className="bg-white/80 backdrop-blur-sm border border-primary/20 rounded-xl p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-medium text-primary mb-1">
                      {bubble.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {bubble.topic}
                    </p>
                    {bubble.description && (
                      <p className="text-sm text-foreground/80">
                        {bubble.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 text-primary">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm font-medium">{bubble.reflect_count}</span>
                  </div>
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                  by {bubble.username}
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
