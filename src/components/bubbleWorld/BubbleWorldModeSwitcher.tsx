
import React from 'react';
import { motion } from 'framer-motion';
import { Axis3D, CircleDashed, Info, AlertTriangle } from 'lucide-react';

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
  console.log('BubbleWorldModeSwitcher render:', { use3DMode, webGLSupported });

  const handleSwitchTo3D = () => {
    if (!webGLSupported) {
      console.warn('WebGL non supportato, impossibile passare alla modalità 3D');
      return; // Prevent switching if WebGL is not supported
    }
    
    // Reset render attempt flag before switching to 3D
    setRenderAttempted(false);
    // Then switch mode
    setUse3DMode(true);
    
    // Debug: Check if canvas exists after mode switch
    setTimeout(() => {
      const canvasExists = document.getElementById('three-js-canvas');
      console.log('BubbleWorldModeSwitcher: Canvas exists after 3D switch?', !!canvasExists);
    }, 1000);
    
    console.log('BubbleWorldModeSwitcher: Passaggio a modalità 3D');
  };
  
  const handleSwitchTo2D = () => {
    setUse3DMode(false);
    console.log('BubbleWorldModeSwitcher: Passaggio a modalità 2D');
  };
  
  return (
    <motion.div 
      className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center shadow-lg rounded-lg bg-white/80 backdrop-blur-md p-2 border-2 border-white/70"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {webGLSupported === false && (
        <div className="mb-2 px-3 py-1 bg-yellow-100 rounded-md text-xs text-yellow-800 flex items-center gap-1">
          <AlertTriangle size={12} />
          <span>WebGL non supportato sul tuo dispositivo</span>
        </div>
      )}
      
      {use3DMode && !document.getElementById('three-js-canvas') && (
        <div className="mb-2 px-3 py-1 bg-red-100 rounded-md text-xs text-red-800 flex items-center gap-1">
          <AlertTriangle size={12} />
          <span>Canvas 3D non trovato nel DOM!</span>
        </div>
      )}
      
      <div className="flex items-center rounded-full bg-gray-100 p-1">
        <button 
          onClick={handleSwitchTo3D}
          className={`flex items-center justify-center gap-1 px-4 py-2 rounded-full transition-all ${
            use3DMode 
              ? 'bg-yellow-500 text-white shadow-md scale-105' 
              : 'bg-transparent text-gray-700 hover:bg-gray-100/60'
          } ${!webGLSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label="3D Mode"
          disabled={!webGLSupported}
          title={!webGLSupported ? 'WebGL non supportato su questo dispositivo' : 'Passa alla modalità 3D'}
        >
          <Axis3D className="h-4 w-4" />
          <span className="text-sm font-medium">3D</span>
          {use3DMode && <span className="ml-1 text-xs">{document.getElementById('three-js-canvas') ? '✓' : '!'}</span>}
        </button>
        <button 
          onClick={handleSwitchTo2D}
          className={`flex items-center justify-center gap-1 px-4 py-2 rounded-full transition-all ${
            !use3DMode 
              ? 'bg-gray-700 text-white shadow-md scale-105' 
              : 'bg-transparent text-gray-700 hover:bg-gray-100/60'
          }`}
          aria-label="2D Mode"
          title="Passa alla modalità 2D"
        >
          <CircleDashed className="h-4 w-4" />
          <span className="text-sm font-medium">2D</span>
        </button>
      </div>
    </motion.div>
  );
};

export default BubbleWorldModeSwitcher;
