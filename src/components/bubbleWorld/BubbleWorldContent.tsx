
import React, { useState, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import BubbleWorld from "@/components/BubbleWorld";
import { BubbleData } from "@/types/bubble";
import { Button } from "@/components/ui/button";

interface BubbleWorldContentProps {
  isLoadingBubbles: boolean;
  bubblesError: Error | null;
  filteredBubbles: BubbleData[];
  bubbleDataForComponent: BubbleData[];
  onBubbleClick: (id: string) => void;
  onCreateBubble: () => void;
  showEarth?: boolean;
}

const BubbleWorldContent = ({
  isLoadingBubbles,
  bubblesError,
  filteredBubbles,
  bubbleDataForComponent,
  onBubbleClick,
  onCreateBubble,
  showEarth = true,
}: BubbleWorldContentProps) => {
  const [retryCount, setRetryCount] = useState(0);

  // Retry loading if there was an error
  useEffect(() => {
    if (bubblesError && retryCount < 3) {
      const timer = setTimeout(() => {
        console.log(`Auto-retrying bubble load (${retryCount + 1}/3)`);
        setRetryCount(prev => prev + 1);
        window.location.reload();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [bubblesError, retryCount]);

  if (isLoadingBubbles) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#ebbd34]" />
        <h3 className="text-lg font-medium">Loading bubbles...</h3>
        <p className="text-sm text-muted-foreground">
          Connecting to the bubble world
        </p>
      </div>
    );
  }

  if (bubblesError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 text-center bg-destructive/10 rounded-lg">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h3 className="text-lg font-medium">Error loading bubbles</h3>
        <p className="text-sm text-muted-foreground">
          {bubblesError.message || "Something went wrong. Please try again."}
        </p>
        <Button onClick={() => window.location.reload()} variant="default">
          Retry
        </Button>
      </div>
    );
  }

  if (filteredBubbles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 text-center bg-muted/50 rounded-lg">
        <h3 className="text-lg font-medium">No bubbles found</h3>
        <p className="text-sm text-muted-foreground">
          No bubbles match your search or filters
        </p>
        <Button onClick={onCreateBubble} className="bg-[#ebbd34] hover:bg-[#ebbd34]/90">
          Create a Bubble
        </Button>
      </div>
    );
  }

  // Prepare bubble data with text displayed on bubbles
  const bubblesWithText = bubbleDataForComponent.map(bubble => ({
    ...bubble,
    text: bubble.name // Use name as the text to display on the bubble
  }));

  console.log(`Rendering BubbleWorldContent with ${bubblesWithText.length} bubbles`);

  return (
    <div className="space-y-4">
      <div className="flex justify-end items-center">
        <div className="text-sm text-muted-foreground">
          {bubbleDataForComponent.length} {bubbleDataForComponent.length === 1 ? 'bubble' : 'bubbles'} found
        </div>
      </div>

      <div className="mb-8 relative overflow-hidden" style={{ height: "70vh" }}>
        <BubbleWorld 
          topics={bubblesWithText} 
          onBubbleClick={onBubbleClick} 
          showEarth={showEarth}
        />
        
        <div className="absolute bottom-4 right-4 bg-black/50 text-white p-2 rounded text-xs">
          {showEarth ? "Bubbles are placed based on their geographic origin" : "3D visualization of bubbles"}
        </div>
      </div>
    </div>
  );
};

export default BubbleWorldContent;
