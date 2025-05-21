
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
  console.log('BubbleWorldStatus render:', { is3DReady, initializationError });
  
  // State to track canvas presence in real-time
  const [canvasPresent, setCanvasPresent] = useState<boolean>(false);
  const [canvasInfo, setCanvasInfo] = useState<{width: number, height: number, display: string, position: string} | null>(null);
  
  // Check for canvas at regular intervals
  useEffect(() => {
    const checkCanvas = () => {
      const canvasElement = document.getElementById('three-js-canvas') as HTMLCanvasElement | null;
      setCanvasPresent(!!canvasElement);
      
      if (canvasElement) {
        setCanvasInfo({
          width: canvasElement.width,
          height: canvasElement.height,
          display: window.getComputedStyle(canvasElement).display,
          position: window.getComputedStyle(canvasElement).position
        });
      } else {
        setCanvasInfo(null);
      }
    };
    
    // Check immediately
    checkCanvas();
    
    // Then check periodically
    const interval = setInterval(checkCanvas, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Always show status overlay for debugging
  const forceShowDebug = true; // Always show debug info
  
  // In development, always show some status
  if (is3DReady && !initializationError && !forceShowDebug) return null;
  
  if (initializationError) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-100/90 backdrop-blur-sm p-6 z-30">
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
        <p className="text-xs text-gray-500 mt-4">Dettaglio errore: {initializationError}</p>
        <p className="text-xs text-gray-500 mt-2">
          Canvas presente nel DOM: {canvasPresent ? '✅ ADESSO' : '❌ MANCANTE'}
        </p>
      </div>
    );
  }
  
  // Debug overlay - always visible for debugging
  if (forceShowDebug) {
    const canvasElement = document.getElementById('three-js-canvas') as HTMLCanvasElement | null;
    return (
      <div className="absolute top-2 left-2 z-50 bg-blue-100/90 p-2 rounded text-xs border-2 border-blue-300 max-w-[300px]">
        <div className="flex items-center gap-1 mb-1 text-blue-800">
          <Info className="w-3 h-3" />
          <span className="font-bold">Debug stato 3D:</span>
        </div>
        <p>Ready: {is3DReady ? '✅' : '❌'}</p>
        <p>Error: {initializationError ? '❌' : '✅'}</p>
        <p>Canvas nel DOM: {canvasPresent ? '✅' : '❌'}</p>
        <p>Ultima verifica: {new Date().toLocaleTimeString()}</p>
        {canvasInfo && (
          <>
            <p>Canvas width: {canvasInfo.width}</p>
            <p>Canvas height: {canvasInfo.height}</p>
            <p>Canvas display: {canvasInfo.display}</p>
            <p>Canvas position: {canvasInfo.position}</p>
          </>
        )}
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
      <p className="text-white/80 text-sm mt-2">Inizializzazione rendering...</p>
      <p className="text-white/60 text-xs mt-4">
        Canvas presente: {canvasPresent ? '✅' : '❌'}
      </p>
    </motion.div>
  );
};

export default BubbleWorldStatus;
