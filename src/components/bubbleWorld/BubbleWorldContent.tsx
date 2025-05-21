
import React from "react";
import { BubbleData } from "@/types/bubble";
import LazyBubbleWorld from "@/components/three/LazyBubbleWorld";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface BubbleWorldContentProps {
  isLoadingBubbles: boolean;
  bubblesError: Error | null;
  filteredBubbles: BubbleData[];
  bubbleDataForComponent: BubbleData[];
  onBubbleClick: (id: string) => void;
  onCreateBubble: () => void;
}

const BubbleWorldContent: React.FC<BubbleWorldContentProps> = ({
  isLoadingBubbles,
  bubblesError,
  filteredBubbles,
  bubbleDataForComponent,
  onBubbleClick,
  onCreateBubble
}) => {
  if (isLoadingBubbles) {
    return (
      <div className="w-full">
        <Skeleton className="w-full h-[600px] rounded-3xl bg-white/50" />
      </div>
    );
  }

  if (bubblesError) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading bubbles. Please refresh the page or try again later.
        </AlertDescription>
      </Alert>
    );
  }

  if (!filteredBubbles || filteredBubbles.length === 0) {
    return (
      <div className="text-center py-20 px-4">
        <h3 className="text-xl font-semibold text-yellow-500 mb-2">No bubbles found</h3>
        <p className="text-slate-600 mb-6">Be the first to create a bubble conversation!</p>
        <button
          onClick={onCreateBubble}
          className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
        >
          Create a Bubble
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] mb-20">
      <LazyBubbleWorld 
        topics={bubbleDataForComponent}
        onBubbleClick={onBubbleClick}
      />
    </div>
  );
};

export default BubbleWorldContent;
