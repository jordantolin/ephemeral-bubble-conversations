
import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { motion } from "framer-motion";

interface BubbleWorldHeaderProps {
  onCreateBubble: () => void;
}

const BubbleWorldHeader: React.FC<BubbleWorldHeaderProps> = ({ onCreateBubble }) => {
  return (
    <div className="flex flex-col items-center justify-between gap-6 mb-10">
      <div className="flex flex-col items-center text-center">
        <motion.div 
          className="flex items-center gap-3 mb-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Logo size="md" />
          <h1 className="text-3xl sm:text-4xl font-bold text-[#ebbd34]">
            Bubble World
          </h1>
        </motion.div>
        
        <motion.p 
          className="text-center text-[#ebbd34]/80 max-w-2xl mx-auto text-sm sm:text-base"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Explore ephemeral bubbles that last for 24 hours. Join conversations and reflect on ideas before they disappear!
        </motion.p>
      </div>
      
      <motion.div 
        className="w-full sm:w-auto"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          onClick={onCreateBubble}
          className="w-full sm:w-auto bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white shadow-md"
          size="lg"
        >
          <Plus className="mr-2 h-5 w-5" />
          New 24h Bubble
        </Button>
      </motion.div>
    </div>
  );
};

export default BubbleWorldHeader;
