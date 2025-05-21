
import React from 'react';
import { motion } from 'framer-motion';

interface BubbleWorldModeSwitcherProps {
  use3DMode: boolean;
  setUse3DMode: (use3D: boolean) => void;
  setRenderAttempted: (attempted: boolean) => void;
}

const BubbleWorldModeSwitcher: React.FC<BubbleWorldModeSwitcherProps> = ({
  use3DMode,
  setUse3DMode,
  setRenderAttempted
}) => {
  return (
    <motion.div 
      className="absolute bottom-4 right-4 z-10"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {use3DMode ? (
        <button 
          onClick={() => setUse3DMode(false)}
          className="px-3 py-1.5 bg-gray-800/70 text-white text-xs rounded-md hover:bg-gray-700/70 transition-colors backdrop-blur-sm"
        >
          Switch to 2D Mode
        </button>
      ) : (
        <button 
          onClick={() => {
            setUse3DMode(true);
            setRenderAttempted(false);
          }}
          className="px-3 py-1.5 bg-yellow-500/70 text-white text-xs rounded-md hover:bg-yellow-600/70 transition-colors backdrop-blur-sm"
        >
          Try 3D Mode
        </button>
      )}
    </motion.div>
  );
};

export default BubbleWorldModeSwitcher;
