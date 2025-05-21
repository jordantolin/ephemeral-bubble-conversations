
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from "@/hooks/use-toast";
import { BubbleData, BubbleWorldProps } from '@/types/bubble';
import WebGLDetector from './bubbleWorld/WebGLDetector';
import Bubble3DWorld from './bubbleWorld/Bubble3DWorld';
import BubbleWorld2D from './bubbleWorld/BubbleWorld2D';
import BubbleWorldModeSwitcher from './bubbleWorld/BubbleWorldModeSwitcher';
import BubbleWorldEmptyState from './bubbleWorld/BubbleWorldEmptyState';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";

const BubbleWorld: React.FC<BubbleWorldProps> = ({ bubbles, onBubbleClick }) => {
  const [explodingBubble, setExplodingBubble] = useState<string | null>(null);
  const [use3DMode, setUse3DMode] = useState<boolean>(true);
  const [renderAttempted, setRenderAttempted] = useState<boolean>(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [webGLSupported, setWebGLSupported] = useState<boolean | null>(null);
  const [hasErrorOccurred, setHasErrorOccurred] = useState<boolean>(false);
  const [shouldShowEmptyState, setShouldShowEmptyState] = useState<boolean>(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Handle case where bubbles is undefined or empty
  const validBubbles = bubbles && Array.isArray(bubbles) ? bubbles : [];
  
  // Extract loading and error states from bubbles prop
  const { isLoadingBubbles, bubblesError } = 
    typeof bubbles === 'undefined' ? { isLoadingBubbles: true, bubblesError: null } 
    : (bubbles as any)._loading !== undefined ? { isLoadingBubbles: (bubbles as any)._loading, bubblesError: (bubbles as any)._error }
    : { isLoadingBubbles: false, bubblesError: null };
  
  // Debug output to help troubleshoot
  useEffect(() => {
    console.log('BubbleWorld component received bubbles:', validBubbles?.length || 0);
    
    // If we have bubbles, ensure the empty state is not shown
    if (validBubbles?.length > 0) {
      setShouldShowEmptyState(false);
      setHasErrorOccurred(false);
    } else if (bubblesError) {
      // If there's an error fetching bubbles, show that instead of the empty state
      setHasErrorOccurred(true);
    } else if (!isLoadingBubbles) {
      // Only show empty state if we're not loading and have no bubbles
      setShouldShowEmptyState(true);
    }
  }, [validBubbles, isLoadingBubbles, bubblesError]);

  // Improved WebGL detection logic
  useEffect(() => {
    const checkWebGLSupport = async () => {
      try {
        const isSupported = WebGLDetector.isWebGLAvailable();
        console.log('WebGL support detected:', isSupported);
        setWebGLSupported(isSupported);
        
        // Only auto-enable 3D mode if WebGL is supported
        setUse3DMode(isSupported);
      } catch (error) {
        console.error('Error during WebGL detection:', error);
        setWebGLSupported(false);
        setUse3DMode(false);
      }
    };
    
    checkWebGLSupport();
  }, []);

  // Handle 3D rendering and potential errors
  useEffect(() => {
    if (use3DMode && validBubbles.length > 0 && !renderAttempted) {
      try {
        setRenderAttempted(true);
        setRenderError(null);
        // The actual rendering happens in Bubble3DWorld component
      } catch (error) {
        console.error('Error while attempting to render 3D world:', error);
        setRenderError('Failed to initialize 3D world');
        // Fallback to 2D mode if 3D fails
        setUse3DMode(false);
      }
    }
  }, [use3DMode, validBubbles.length, renderAttempted]);

  // Show toast if 3D rendering fails
  useEffect(() => {
    if (renderError && !use3DMode) {
      toast({
        title: "3D Rendering Issue",
        description: "Using 2D mode instead. Try refreshing the browser.",
        variant: "destructive"
      });
    }
  }, [renderError, toast, use3DMode]);

  const handleRetry = () => {
    // Force a page refresh to retry loading data
    window.location.reload();
  };
  
  // Show error state if there's a problem fetching bubbles
  if (hasErrorOccurred || bubblesError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <div className="bg-red-100 rounded-lg p-8 max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-red-500 w-8 h-8" />
          </div>
          <h3 className="text-lg font-medium text-red-800 mb-2">Error fetching bubbles</h3>
          <p className="text-red-600 mb-6">Please check your connection and try again</p>
          <Button onClick={handleRetry} className="bg-red-500 hover:bg-red-600 text-white">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Show loading state if bubbles are being fetched
  if (isLoadingBubbles) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full border-4 border-[#ebbd34]/10 border-t-[#ebbd34] animate-spin"></div>
          <p className="text-[#ebbd34] mt-4">Loading bubbles...</p>
        </div>
      </div>
    );
  }

  // If no valid bubbles and we should show empty state, render placeholder content
  if (shouldShowEmptyState || validBubbles.length === 0) {
    return (
      <BubbleWorldEmptyState 
        onReload={() => window.location.reload()} 
      />
    );
  }

  return (
    <div className="w-full h-full relative">
      {use3DMode ? (
        <Bubble3DWorld 
          bubbles={validBubbles} 
          onBubbleClick={onBubbleClick}
        />
      ) : (
        <BubbleWorld2D
          bubbles={validBubbles}
          onBubbleClick={onBubbleClick}
          explodingBubble={explodingBubble}
          setExplodingBubble={setExplodingBubble}
        />
      )}
      
      {webGLSupported !== null && (
        <BubbleWorldModeSwitcher 
          use3DMode={use3DMode}
          setUse3DMode={setUse3DMode}
          setRenderAttempted={setRenderAttempted}
        />
      )}
    </div>
  );
};

export default BubbleWorld;
