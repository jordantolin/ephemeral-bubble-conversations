
import React from "react";
import { useNetwork } from "@/context/NetworkContext";
import { WifiOff } from "lucide-react";

const OfflineIndicator: React.FC = () => {
  const { isOnline, queuedActions } = useNetwork();

  if (isOnline) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-red-100 border border-red-300 text-red-800 px-4 py-2 rounded-md shadow-md animate-pulse">
      <WifiOff className="h-4 w-4" />
      <span>Offline</span>
      {queuedActions.length > 0 && (
        <span className="bg-red-200 text-red-800 text-xs px-2 py-1 rounded-full ml-1">
          {queuedActions.length}
        </span>
      )}
    </div>
  );
};

export default OfflineIndicator;
