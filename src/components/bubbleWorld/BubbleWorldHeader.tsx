
import React from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface BubbleWorldHeaderProps {
  onCreateBubble: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  title?: string;
  showDescription?: boolean;
  showCreateButton?: boolean;
}

const BubbleWorldHeader: React.FC<BubbleWorldHeaderProps> = ({ 
  onCreateBubble,
  onRefresh,
  isRefreshing = false,
  title = "Bubble World",
  showDescription = true,
  showCreateButton = true
}) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
      <div className="mb-4 md:mb-0">
        <h1 className="text-2xl md:text-3xl font-bold text-[#ebbd34]">{title}</h1>
        {showDescription && (
          <p className="text-gray-600 mt-1">Explore conversations that are bubbling right now</p>
        )}
      </div>
      <div className="flex items-center space-x-3">
        {onRefresh && (
          <Button
            onClick={onRefresh}
            variant="outline"
            size="sm"
            className="border-[#ebbd34]/30 text-[#ebbd34] hover:bg-[#ebbd34]/10"
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        )}
        {showCreateButton && (
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Button 
              onClick={onCreateBubble}
              className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Bubble
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default BubbleWorldHeader;
