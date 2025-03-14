
import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BubbleHeaderProps {
  cameFromBubbleWorld: boolean;
  bubbleName: string;
  bubbleTopic?: string;
  onReflect: () => Promise<void>;
  isExpired: boolean;
}

const BubbleHeader: React.FC<BubbleHeaderProps> = ({
  cameFromBubbleWorld,
  bubbleName,
  bubbleTopic,
  onReflect,
  isExpired
}) => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#ebbd34]/10">
      <div className="container mx-auto">
        <div className="flex items-center justify-between h-16 px-4">
          {/* Back button and title */}
          <div className="flex items-center gap-6 flex-1">
            <Link to={cameFromBubbleWorld ? "/" : "/feed"} className="flex items-center gap-2 shrink-0">
              <ArrowLeft className="text-[#ebbd34] w-5 h-5" />
              <span className="text-xl font-semibold text-[#ebbd34] hidden sm:inline">
                {cameFromBubbleWorld ? "Back to Bubble World" : "Back to Feed"}
              </span>
            </Link>
          </div>

          {/* Bubble title in navbar */}
          <div className="flex-1 text-center">
            <h1 className="text-xl font-semibold text-[#ebbd34]">
              {bubbleName}
            </h1>
            {bubbleTopic && <p className="text-sm text-[#ebbd34]/70 hidden sm:block">{bubbleTopic}</p>}
          </div>

          {/* Reflect button */}
          <div className="flex-1 flex justify-end">
            <Button
              onClick={onReflect}
              className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white rounded-full"
              size="sm"
              disabled={isExpired}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Reflect
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default BubbleHeader;
