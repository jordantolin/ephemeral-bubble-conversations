
import React from 'react';

interface BubbleWorldInstructionsProps {
  is3DReady: boolean;
}

const BubbleWorldInstructions: React.FC<BubbleWorldInstructionsProps> = ({ is3DReady }) => {
  if (!is3DReady) return null;
  
  return (
    <div className="absolute bottom-4 left-4 text-xs bg-black/30 px-3 py-2 rounded-md backdrop-blur-sm text-white">
      <p className="mb-1">• Click and drag to rotate view</p>
      <p className="mb-1">• Scroll to zoom in/out</p>
      <p>• Hold Alt/Option + Click to reflect a bubble</p>
    </div>
  );
};

export default BubbleWorldInstructions;
