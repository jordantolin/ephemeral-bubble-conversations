
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Axis3D, CircleDashed, Info, AlertTriangle, RefreshCw, Eye } from 'lucide-react';

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
  
  // State to track canvas presence in real-time
  const [canvasPresent, setCanvasPresent] = useState<boolean>(false);
  const [canvasDimensions, setCanvasDimensions] = useState<{width: number, height: number} | null>(null);
  
  // Check for canvas at regular intervals with improved diagnostics
  useEffect(() => {
    const checkCanvas = () => {
      const canvasElement = document.getElementById('three-js-canvas') as HTMLCanvasElement | null;
      setCanvasPresent(!!canvasElement);
      
      // Log the canvas state for debugging
      if (canvasElement) {
        setCanvasDimensions({
          width: canvasElement.width,
          height: canvasElement.height
        });
        
        console.log('BubbleWorldModeSwitcher: Canvas check FOUND', {
          present: true,
          isConnected: canvasElement.isConnected,
          parent: canvasElement.parentElement,
          width: canvasElement.width,
          height: canvasElement.height,
          style: {
            width: canvasElement.style.width,
            height: canvasElement.style.height,
            position: canvasElement.style.position,
            zIndex: canvasElement.style.zIndex,
            visibility: canvasElement.style.visibility,
            display: canvasElement.style.display
          }
        });
        
        // Force canvas to remain visible
        if (canvasElement.style.visibility !== 'visible' || canvasElement.style.display === 'none') {
          canvasElement.style.visibility = 'visible';
          canvasElement.style.display = 'block';
          console.log('BubbleWorldModeSwitcher: Fixed canvas visibility');
        }
      } else {
        console.log('BubbleWorldModeSwitcher: Canvas NOT FOUND');
        setCanvasDimensions(null);
      }
    };
    
    // Check immediately
    checkCanvas();
    
    // Then check periodically when in 3D mode
    let interval: number | null = null;
    if (use3DMode) {
      interval = window.setInterval(checkCanvas, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [use3DMode]);

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
  
  const handleForceReinitialize = () => {
    // Force reinitialize 3D mode
    setUse3DMode(false);
    setRenderAttempted(false);
    
    // Force a window resize event to help with canvas reinitialization
    window.dispatchEvent(new Event('resize'));
    
    // Switch back to 3D mode after a delay
    setTimeout(() => {
      setUse3DMode(true);
      console.log('BubbleWorldModeSwitcher: Forced reinitialization of 3D world');
    }, 300);
  };
  
  const handleForceShowCanvas = () => {
    const canvas = document.getElementById('three-js-canvas') as HTMLCanvasElement | null;
    if (canvas) {
      // Apply extreme styles to force visibility
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.zIndex = '9999';
      canvas.style.visibility = 'visible';
      canvas.style.display = 'block';
      canvas.style.backgroundColor = '#ff0000';
      canvas.style.border = '10px solid yellow';
      
      console.log('BubbleWorldModeSwitcher: Forced canvas to maximum visibility');
      
      // Reset after 5 seconds
      setTimeout(() => {
        if (canvas) {
          canvas.style.position = 'absolute';
          canvas.style.zIndex = '10';
          canvas.style.width = 'auto';
          canvas.style.height = 'auto';
        }
      }, 5000);
    } else {
      console.log('BubbleWorldModeSwitcher: Cannot force show canvas - not found');
    }
  };
  
  return (
    <motion.div 
      className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-40 flex flex-col items-center shadow-lg rounded-lg bg-white/80 backdrop-blur-md p-2 border-2 border-white/70"
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
      
      {use3DMode && !canvasPresent && (
        <div className="mb-2 px-3 py-1 bg-red-100 rounded-md text-xs text-red-800 flex items-center gap-1">
          <AlertTriangle size={12} />
          <span>Canvas 3D non trovato nel DOM!</span>
        </div>
      )}
      
      {use3DMode && canvasPresent && canvasDimensions && (
        <div className="mb-2 px-3 py-1 bg-green-100 rounded-md text-xs text-green-800 flex items-center justify-between w-full">
          <span>Canvas: {canvasDimensions.width}x{canvasDimensions.height}px</span>
          <button 
            onClick={handleForceShowCanvas}
            className="ml-1 flex items-center gap-1 text-blue-600 hover:text-blue-800"
            title="Forza visualizzazione canvas"
          >
            <Eye className="h-3 w-3"/> Mostra
          </button>
        </div>
      )}
      
      <div className="flex flex-col gap-2 items-center">
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
            {use3DMode && <span className="ml-1 text-xs">{canvasPresent ? '✓' : '!'}</span>}
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
        
        {use3DMode && (
          <button 
            onClick={handleForceReinitialize}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-full flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Reinizializza 3D
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default BubbleWorldModeSwitcher;
