
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useToast } from "@/hooks/use-toast";
import { BubbleData, BubbleWorldProps } from '@/types/bubble';
import WebGLDetector from './bubbleWorld/WebGLDetector';
import Bubble3DWorld from './bubbleWorld/Bubble3DWorld';
import BubbleWorld2D from './bubbleWorld/BubbleWorld2D';
import BubbleWorldModeSwitcher from './bubbleWorld/BubbleWorldModeSwitcher';
import BubbleWorldEmptyState from './bubbleWorld/BubbleWorldEmptyState';

const BubbleWorld: React.FC<BubbleWorldProps> = ({ bubbles, onBubbleClick }) => {
  const [explodingBubble, setExplodingBubble] = useState<string | null>(null);
  const [use3DMode, setUse3DMode] = useState<boolean>(true);
  const [renderAttempted, setRenderAttempted] = useState<boolean>(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [webGLSupported, setWebGLSupported] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Handle case where bubbles is undefined or empty
  const validBubbles = Array.isArray(bubbles) ? bubbles : [];
  
  // Debug output to help troubleshoot
  useEffect(() => {
    console.log('BubbleWorld component received bubbles:', validBubbles.length);
  }, [validBubbles]);

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

  // If no valid bubbles, render placeholder content
  if (validBubbles.length === 0) {
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
