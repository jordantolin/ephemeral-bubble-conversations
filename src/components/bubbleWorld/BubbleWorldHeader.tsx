
import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BubbleWorldHeaderProps {
  onCreateBubble: () => void;
  showDescription?: boolean;
  showCreateButton?: boolean;
  title?: string;
}

const BubbleWorldHeader: React.FC<BubbleWorldHeaderProps> = ({ 
  onCreateBubble, 
  showDescription = true,
  showCreateButton = true,
  title = "Bubble World"
}) => {
  return (
    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-yellow-500 tracking-tight mb-2">
          <span>{title}</span>
        </h1>
        {showDescription && (
          <p className="text-yellow-500/80 text-lg max-w-xl">
            Explore ephemeral bubbles that last for just 24 hours. Join conversations and reflect on ideas before they disappear!
          </p>
        )}
      </div>
      
      {showCreateButton && (
        <Button
          onClick={onCreateBubble}
          className="bg-yellow-500 hover:bg-yellow-600 text-white shadow-md transform hover:scale-105 transition-all duration-200"
          size="lg"
        >
          <Plus className="mr-2 h-5 w-5" />
          New 24h Bubble
        </Button>
      )}
    </div>
  );
};

export default BubbleWorldHeader;
