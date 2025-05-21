
import React from "react";

interface ReconnectionIndicatorProps {
  isReconnecting: boolean;
}

const ReconnectionIndicator: React.FC<ReconnectionIndicatorProps> = ({ isReconnecting }) => {
  if (!isReconnecting) return null;
  
  return (
    <div className="fixed top-16 inset-x-0 z-50 flex justify-center">
      <div className="bg-amber-100 border border-amber-300 text-amber-800 px-4 py-2 rounded-md shadow-md flex items-center">
        <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse mr-2"></div>
        <span>Reconnecting to Bubble Trouble...</span>
      </div>
    </div>
  );
};

export default ReconnectionIndicator;
