
import React from 'react';
import { motion } from 'framer-motion';
import { Axis3D, CircleDashed } from 'lucide-react';

interface BubbleWorldModeSwitcherProps {
  use3DMode: boolean;
  setUse3DMode: (use3D: boolean) => void;
  setRenderAttempted: (attempted: boolean) => void;
  webGLSupported?: boolean | null;
}

const BubbleWorldModeSwitcher: React.FC<BubbleWorldModeSwitcherProps> = ({
  use3DMode,
  setUse3DMode,
  setRenderAttempted,
  webGLSupported = true
}) => {
  const handleSwitchTo3D = () => {
    if (!webGLSupported) {
      console.warn('WebGL not supported, but user attempted to switch to 3D mode');
      return; // Prevent switching if WebGL is not supported
    }
    
    // Reset render attempt flag before switching to 3D
    setRenderAttempted(false);
    // Then switch mode
    setUse3DMode(true);
  };
  
  const handleSwitchTo2D = () => {
    setUse3DMode(false);
  };
  
  return (
    <motion.div 
      className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10 flex items-center shadow-lg rounded-full bg-white/20 backdrop-blur-sm p-1 border border-white/30"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <button 
        onClick={handleSwitchTo3D}
        className={`flex items-center justify-center gap-1 px-4 py-2 rounded-full ${
          use3DMode 
            ? 'bg-yellow-500 text-white' 
            : 'bg-transparent text-gray-700 hover:bg-gray-100/60'
        } transition-colors ${!webGLSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label="3D Mode"
        disabled={!webGLSupported}
      >
        <Axis3D className="h-4 w-4" />
        <span className="text-sm font-medium">3D</span>
      </button>
      <button 
        onClick={handleSwitchTo2D}
        className={`flex items-center justify-center gap-1 px-4 py-2 rounded-full ${
          !use3DMode 
            ? 'bg-gray-700 text-white' 
            : 'bg-transparent text-gray-700 hover:bg-gray-100/60'
        } transition-colors`}
        aria-label="2D Mode"
      >
        <CircleDashed className="h-4 w-4" />
        <span className="text-sm font-medium">2D</span>
      </button>
    </motion.div>
  );
};

export default BubbleWorldModeSwitcher;
