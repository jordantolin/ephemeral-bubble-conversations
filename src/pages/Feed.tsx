
import MainNav from "@/components/MainNav";
import BubbleWorld from "@/components/BubbleWorld";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
      return data;
    }
  });

  const handleBubbleClick = (id: string) => {
    // Handle bubble click (you can implement this later)
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC]">
      <MainNav />
      
      <main className="container relative mx-auto px-2 sm:px-4 py-4 sm:py-8 flex flex-col items-center justify-center min-h-[calc(100dvh-64px)]">
        <div className="text-center mb-4 sm:mb-8 relative z-10">
          <h1 className="text-2xl sm:text-4xl font-light text-primary mb-2">
            Top Bubbles
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

export default Feed;
