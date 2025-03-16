
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNetwork } from "@/context/NetworkContext";
import useBubbleData from "@/hooks/useBubbleData";
import { createBubbleHelpers } from "@/utils/feedHelpers";
import BubbleWorld from "@/components/BubbleWorld";
import NavigationBar from "@/components/bubbleWorld/NavigationBar";
import BubbleChat from "@/components/bubbleWorld/BubbleChat";
import CreateBubbleDialog from "@/components/bubbleWorld/CreateBubbleDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const Feed: React.FC = () => {
  const { user } = useAuth();
  const { isOnline } = useNetwork();
  const { toast } = useToast();
  const [createBubbleOpen, setCreateBubbleOpen] = useState(false);
  
  const {
    bubbleDataForComponent,
    selectedBubbleId,
    setSelectedBubbleId,
    chatOpen,
    setChatOpen,
    handleReflect,
    isLoadingBubbles,
    searchQuery,
    setSearchQuery,
    isReconnecting
  } = useBubbleData();
  
  const { selectBubble } = createBubbleHelpers({
    setSelectedBubbleId,
    setChatOpen
  });

  // Notify user when they're offline
  useEffect(() => {
    if (!isOnline) {
      toast({
        title: "You're offline",
        description: "Some features may be limited until you reconnect",
        variant: "destructive"
      });
    }
  }, [isOnline, toast]);

  // Render a loading state while bubbles are being fetched
  if (isLoadingBubbles) {
    return (
      <div className="min-h-screen bg-[#FEF7E4]">
        <NavigationBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        <div className="pt-24 pb-16 px-4 container mx-auto max-w-7xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#333]">Loading Bubble Feed</h1>
            <p className="text-gray-600 mt-2">Please wait while we load the latest bubbles...</p>
          </div>
          <div className="flex flex-col gap-4">
            <Skeleton className="h-[300px] w-full rounded-lg" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-[150px] rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FEF7E4]">
      <NavigationBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      
      <div className="pt-24 pb-16 container mx-auto max-w-7xl">
        <div className="relative h-[500px] sm:h-[600px] md:h-[700px] rounded-xl overflow-hidden bg-white/40 backdrop-blur-sm border border-amber-100/40 shadow-sm">
          {bubbleDataForComponent.length === 0 && !isLoadingBubbles ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">No Bubbles Found</h2>
              <p className="text-gray-600 mb-6">Create a new bubble or try a different search term.</p>
              <Button 
                onClick={() => setCreateBubbleOpen(true)}
                className="bg-[#ebbd34] hover:bg-amber-500 text-white font-semibold"
              >
                <Plus className="mr-1 h-4 w-4" />
                Create a New Bubble
              </Button>
            </div>
          ) : (
            <BubbleWorld 
              bubbles={bubbleDataForComponent}
              onBubbleClick={selectBubble}
              onBubbleReflect={handleReflect}
              isReconnecting={isReconnecting}
            />
          )}
        </div>
        
        {user && (
          <div className="mt-6 flex justify-center">
            <Button 
              onClick={() => setCreateBubbleOpen(true)}
              className="bg-[#ebbd34] hover:bg-amber-500 text-white font-semibold"
            >
              <Plus className="mr-1 h-4 w-4" />
              Create a New Bubble
            </Button>
          </div>
        )}
      </div>
      
      {selectedBubbleId && (
        <BubbleChat
          bubbleId={selectedBubbleId}
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      )}
      
      <CreateBubbleDialog
        isOpen={createBubbleOpen}
        onClose={() => setCreateBubbleOpen(false)}
      />
    </div>
  );
};

export default Feed;
