
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface BubbleWorldEmptyStateProps {
  onReload: () => void;
  onCreateBubble?: () => void;
}

const BubbleWorldEmptyState: React.FC<BubbleWorldEmptyStateProps> = ({
  onReload,
  onCreateBubble
}) => {
  return (
    <div className="w-full h-full flex flex-col justify-center items-center">
      <p className="text-gray-500 mb-4">No bubbles available to display</p>
      <div className="flex gap-3">
        <button 
          onClick={onReload}
          className="px-4 py-2 bg-yellow-500/70 text-white rounded-md hover:bg-yellow-600/70 transition-colors"
        >
          Reload Bubbles
        </button>
        
        {onCreateBubble && (
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={onCreateBubble}
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
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

export default BubbleWorldEmptyState;
