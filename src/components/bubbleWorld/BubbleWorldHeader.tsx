
import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BubbleWorldHeaderProps {
  onCreateBubble: () => void;
}

const BubbleWorldHeader: React.FC<BubbleWorldHeaderProps> = ({ onCreateBubble }) => {
  return (
    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
      <div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-[#ebbd34] tracking-tight mb-2">
          Bubble World
        </h1>
        <p className="text-[#ebbd34]/80 text-lg max-w-xl">
          Explore ephemeral bubbles that last for just 24 hours. Join conversations and reflect on ideas before they disappear!
        </p>
      </div>
      
      <Button
        onClick={onCreateBubble}
        className="bg-[#ebbd34] hover:bg-[#ebbd34]/80 text-white shadow-md transform hover:scale-105 transition-all duration-200"
        size="lg"
      >
        <Plus className="mr-2 h-5 w-5" />
        New 24h Bubble
      </Button>
    </div>
  );
};

export default BubbleWorldHeader;
