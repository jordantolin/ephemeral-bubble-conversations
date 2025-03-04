
import React from "react";
import { useNetwork } from "@/context/NetworkContext";
import { WifiOff, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

const OfflineIndicator: React.FC = () => {
  const { isOnline, queuedActions, executeQueuedActions } = useNetwork();

  if (isOnline && queuedActions.length === 0) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {!isOnline && (
        <div className="flex items-center gap-2 bg-red-100 border border-red-300 text-red-800 px-4 py-2 rounded-md shadow-md animate-pulse">
          <WifiOff className="h-4 w-4" />
          <span>Offline</span>
        </div>
      )}
      
      {queuedActions.length > 0 && (
        <div className="bg-amber-100 border border-amber-300 text-amber-800 px-4 py-2 rounded-md shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>Pending Actions: {queuedActions.length}</span>
            </div>
            
            {isOnline && (
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-2 bg-amber-200 hover:bg-amber-300 border-amber-300"
                onClick={() => executeQueuedActions()}
              >
                <Send className="h-3 w-3 mr-1" />
                Send Now
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator;
