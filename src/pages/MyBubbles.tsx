
import MainNav from "@/components/MainNav";
import BubbleWorld from "@/components/BubbleWorld";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BubbleData } from "@/types/bubble";

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

      // Convert size to correct type
      return data.map(bubble => ({
        ...bubble,
        size: bubble.size as "sm" | "md" | "lg"
      })) as BubbleData[];
    }
  });

  const handleBubbleClick = (id: string) => {
    // Handle bubble click
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC]">
      <MainNav />
      
      <main className="container relative mx-auto px-2 sm:px-4 py-4 sm:py-8 flex flex-col items-center justify-center min-h-[calc(100dvh-64px)]">
        <div className="text-center mb-4 sm:mb-8 relative z-10">
          <h1 className="text-2xl sm:text-4xl font-light text-primary mb-2">
            My Reflected Bubbles
          </h1>
          <div className="h-px w-24 bg-primary/20 mx-auto" />
        </div>

        <div className="relative w-full h-[calc(100dvh-240px)] sm:h-[600px] max-w-3xl rounded-2xl overflow-hidden bg-transparent">
          <BubbleWorld 
            topics={bubbles}
            onBubbleClick={handleBubbleClick}
          />
        </div>
      </main>
    </div>
  );
};

export default MyBubbles; // Fix export
