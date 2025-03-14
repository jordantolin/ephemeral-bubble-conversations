
import React from "react";
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

  return (
    <div className="mb-8 relative overflow-hidden" style={{ height: "70vh" }}>
      <BubbleWorld 
        topics={bubbleDataForComponent} 
        onBubbleClick={onBubbleClick} 
        showEarth={showEarth}
      />
      
      <div className="absolute bottom-4 right-4 bg-black/50 text-white p-2 rounded text-xs">
        {showEarth ? "Bubbles are placed based on their geographic origin" : "3D visualization of bubbles"}
      </div>
    </div>
  );
};

export default BubbleWorldContent;
