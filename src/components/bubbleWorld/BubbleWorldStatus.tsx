
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, AlertTriangle, Info } from 'lucide-react';

interface BubbleWorldStatusProps {
  is3DReady: boolean;
  initializationError: string | null;
  onRetry?: () => void;
}

const BubbleWorldStatus: React.FC<BubbleWorldStatusProps> = ({ 
  is3DReady, 
  initializationError,
  onRetry 
}) => {
  // State to track canvas presence in real-time
  const [canvasPresent, setCanvasPresent] = useState<boolean>(false);
  
  // Check for canvas at regular intervals
  useEffect(() => {
    const checkCanvas = () => {
      const canvasElement = document.getElementById('three-js-canvas') as HTMLCanvasElement | null;
      setCanvasPresent(!!canvasElement);
    };
    
    // Check immediately
    checkCanvas();
    
    // Then check periodically
    const interval = setInterval(checkCanvas, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Only show status in development or when there's an error
  const showDebug = process.env.NODE_ENV === 'development';
  
  if (is3DReady && !initializationError && !showDebug) return null;
  
  if (initializationError) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-100/90 backdrop-blur-sm p-6 z-50">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-medium text-red-800 mb-2">Rendering 3D fallito</h3>
        <p className="text-center text-red-600 mb-4">{initializationError}</p>
        <button 
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 flex items-center gap-2"
          onClick={() => onRetry ? onRetry() : window.location.reload()}
        >
          <RefreshCw className="w-4 h-4" />
          Riprova
        </button>
        <p className="text-xs text-gray-500 mt-2">
          Canvas presente nel DOM: {canvasPresent ? '✅' : '❌'}
        </p>
      </div>
    );
  }
  
  // Debug overlay - only visible in development
  if (showDebug) {
    return (
      <div className="absolute top-2 right-2 z-50 bg-blue-100/80 p-2 rounded text-xs border border-blue-300 max-w-[150px]">
        <div className="flex items-center gap-1 mb-1 text-blue-800">
          <Info className="w-3 h-3" />
          <span className="font-bold">3D Status:</span>
        </div>
        <p>Ready: {is3DReady ? '✅' : '❌'}</p>
        <p>Canvas: {canvasPresent ? '✅' : '❌'}</p>
      </div>
    );
  }
  
  // Loading state
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-30"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="w-12 h-12 rounded-full border-4 border-t-yellow-400 border-yellow-200 animate-spin mb-3"></div>
      <p className="text-white text-lg font-medium">Caricamento ambiente 3D...</p>
    </motion.div>
  );
};

export default BubbleWorldStatus;
