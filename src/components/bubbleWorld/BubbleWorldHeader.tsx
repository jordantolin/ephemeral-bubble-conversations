
import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";

interface BubbleWorldHeaderProps {
  onCreateBubble: () => void;
}

const BubbleWorldHeader: React.FC<BubbleWorldHeaderProps> = ({ onCreateBubble }) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-3">
        <Logo size="sm" />
        <h1 className="text-2xl sm:text-3xl font-light text-[#ebbd34]">
          Bubble World
        </h1>
      </div>
      <div className="w-full sm:w-auto">
        <Button
          onClick={onCreateBubble}
          className="w-full sm:w-auto bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white shadow"
          size="lg"
        >
          <Plus className="mr-2 h-5 w-5" />
          New 24h Bubble
        </Button>
      </div>
    </div>
  );
};

export default BubbleWorldHeader;
