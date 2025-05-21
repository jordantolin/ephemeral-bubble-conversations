
import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, AlertTriangle } from 'lucide-react';

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
  if (is3DReady && !initializationError) return null;
  
  if (initializationError) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-100/80 backdrop-blur-sm p-6 z-20">
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
      </div>
    );
  }
  
  // Loading state
  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-black/10 backdrop-blur-sm z-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="w-12 h-12 rounded-full border-4 border-t-yellow-400 border-yellow-200 animate-spin mb-3"></div>
      <p className="text-gray-700">Caricamento ambiente 3D...</p>
      <p className="text-xs text-gray-500 mt-2">Inizializzazione rendering...</p>
    </motion.div>
  );
};

export default BubbleWorldStatus;
