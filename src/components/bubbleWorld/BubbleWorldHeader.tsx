
import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Logo from "@/components/Logo";

interface BubbleWorldHeaderProps {
  onCreateBubble: () => void;
}

const BubbleWorldHeader: React.FC<BubbleWorldHeaderProps> = ({ onCreateBubble }) => {
  return (
    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6 sm:mb-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-3"
      >
        <Logo withText={false} className="w-10 h-10" />
        
        <div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#ebbd34] tracking-tight mb-2 leading-tight">
            Bubble Trouble
          </h1>
          <p className="text-[#ebbd34]/80 text-sm sm:text-base md:text-lg max-w-xl">
            Explore ephemeral bubbles that last for 24 hours. Join conversations and reflect on ideas before they disappear!
          </p>
        </div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Button
          onClick={onCreateBubble}
          className="bg-[#ebbd34] hover:bg-[#ebbd34]/80 text-white shadow-md transform hover:scale-105 transition-all duration-200 w-full sm:w-auto"
          size="lg"
        >
          <Plus className="mr-2 h-5 w-5" />
          <span className="mr-1">New</span>
          <span className="hidden sm:inline">24h Bubble</span>
        </Button>
      </motion.div>
    </div>
  );
};

export default BubbleWorldHeader;
