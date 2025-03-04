
import React from "react";
import { useNetwork } from "@/context/NetworkContext";
import { RefreshCw } from "lucide-react";

const ReconnectionIndicator: React.FC<{ isReconnecting: boolean }> = ({ 
  isReconnecting 
}) => {
  const { isOnline } = useNetwork();
  
  if (!isReconnecting || !isOnline) return null;
  
  return (
    <div className="fixed top-16 inset-x-0 z-50 flex justify-center">
      <div className="bg-amber-100 border border-amber-300 text-amber-800 px-4 py-2 rounded-md shadow-md flex items-center">
        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
        <span>Reconnecting to Bubble Trouble...</span>
      </div>
    </div>
  );
};

export default ReconnectionIndicator;
