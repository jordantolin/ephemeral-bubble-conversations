
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BubbleWorld from "@/components/BubbleWorld";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/UserContext";
import { BubbleData } from "@/types/bubble";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Feed = () => {
  const navigate = useNavigate();
  const { user, loading } = useUser();
  const [isReady, setIsReady] = useState(false);
  const [topics, setTopics] = useState<BubbleData[]>([]);
  const { toast } = useToast();

  // Fetch bubbles data
  useEffect(() => {
    const fetchBubbles = async () => {
      if (!user) return;
      
      try {
        console.log("Fetching bubbles for 3D world...");
        const { data, error } = await supabase
          .from("bubbles")
          .select("id, name, description, user_id, created_at, profiles(username)")
          .order("created_at", { ascending: false });
          
        if (error) {
          console.error("Error fetching bubbles:", error);
          return;
        }
        
        // Transform data to match BubbleData type
        const bubbleData: BubbleData[] = data.map((bubble: any) => ({
          id: bubble.id,
          topic: bubble.description || "Join this bubble!",
          username: bubble.profiles?.username || "Anonymous",
          name: bubble.name,
          size: Math.random() > 0.7 ? "lg" : Math.random() > 0.4 ? "md" : "sm",
          reflect_count: Math.floor(Math.random() * 10),
          created_at: bubble.created_at,
        }));
        
        console.log("Bubbles fetched:", bubbleData.length);
        setTopics(bubbleData);
      } catch (e) {
        console.error("Exception while fetching bubbles:", e);
      }
    };
    
    if (user) {
      fetchBubbles();
    }
  }, [user]);

  // Handle bubble click
  const handleBubbleClick = (id: string) => {
    console.log("Bubble clicked:", id);
    toast({
      title: "Bubble Selected",
      description: `You clicked on bubble ${id}`,
    });
    
    // You can implement additional functionality here, like opening a dialog
    // or navigating to a detail page
  };

  useEffect(() => {
    console.log("Feed page: Loading state -", loading ? "loading" : "loaded", "User -", user ? "logged in" : "not logged in");
    
    // Check if user is not authenticated and redirect to auth page
    if (!loading && !user) {
      console.log("User not authenticated, redirecting to auth page");
      navigate("/auth");
      return;
    }
    
    // Set a small delay to ensure the 3D world loads properly
    const timer = setTimeout(() => {
      console.log("3D world is ready to render");
      setIsReady(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [user, loading, navigate]);

  if (loading || !isReady) {
    console.log("Showing loading screen in Feed");
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC]">
        <div className="text-center">
          <div className="mb-4 h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-[#ebbd34]"></div>
          <p className="text-xl text-[#ebbd34]">Caricamento del mondo 3D...</p>
          <p className="mt-2 text-[#ebbd34]/70">Preparati ad esplorare le bolle!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Overlay navigation */}
      <div className="absolute left-0 right-0 top-0 z-10 border-b border-white/10 bg-black/30 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between p-4">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png"
              alt="Bubble Trouble"
              className="h-8 w-8"
            />
            <span className="text-xl font-bold text-white">Bubble Trouble</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/my-bubbles">
              <Button variant="ghost" className="text-white hover:bg-white/10">
                Le mie bolle
              </Button>
            </Link>
            <Link to="/profile">
              <Button variant="ghost" className="text-white hover:bg-white/10">
                Profilo
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 3D World - Now passing the required props */}
      <BubbleWorld topics={topics} onBubbleClick={handleBubbleClick} />

      {/* Help tooltip */}
      <div className="absolute bottom-4 left-4 z-10 max-w-xs rounded-lg bg-black/50 p-4 text-sm text-white backdrop-blur-sm">
        <h3 className="mb-2 font-semibold">Comandi:</h3>
        <ul className="space-y-1 text-white/80">
          <li>🖱️ Click sulle bolle per interagire</li>
          <li>⌨️ WASD o frecce per muoverti</li>
          <li>🖱️ Trascina per ruotare la visuale</li>
          <li>⚡ Doppio click per accelerare</li>
        </ul>
      </div>
    </div>
  );
};

export default Feed;
