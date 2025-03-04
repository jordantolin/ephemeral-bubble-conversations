
import React from "react";
import { useNetwork } from "@/context/NetworkContext";
import { WifiOff, Send, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const OfflineIndicator: React.FC = () => {
  const { isOnline, queuedActions, executeQueuedActions } = useNetwork();

  if (isOnline && queuedActions.length === 0) return null;
  
  return (
    <AnimatePresence>
      <motion.div 
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
      >
        {!isOnline && (
          <motion.div 
            className="flex items-center gap-2 bg-red-100 border border-red-300 text-red-800 px-4 py-2 rounded-md shadow-md"
            animate={{ 
              boxShadow: ['0 4px 6px rgba(0,0,0,0.1)', '0 4px 12px rgba(239,68,68,0.2)'],
              opacity: [0.9, 1]
            }}
            transition={{ 
              repeat: Infinity, 
              repeatType: "reverse", 
              duration: 1.5 
            }}
          >
            <WifiOff className="h-4 w-4" />
            <span>You're currently offline</span>
          </motion.div>
        )}
        
        {queuedActions.length > 0 && (
          <motion.div 
            className="bg-amber-100 border border-amber-300 text-amber-800 px-4 py-2 rounded-md shadow-md"
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>Pending Actions: {queuedActions.length}</span>
              </div>
              
              {isOnline && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-2 bg-amber-200 hover:bg-amber-300 border-amber-300 transition-colors duration-300"
                  onClick={() => executeQueuedActions()}
                >
                  <Send className="h-3 w-3 mr-1" />
                  Send Now
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default OfflineIndicator;
