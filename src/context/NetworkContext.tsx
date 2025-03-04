
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useToast } from "@/hooks/use-toast";

interface NetworkContextType {
  isOnline: boolean;
  queuedActions: QueuedAction[];
  addQueuedAction: (action: Omit<QueuedAction, 'id'>) => void;
  executeQueuedActions: () => Promise<void>;
}

export interface QueuedAction {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  execute: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [queuedActions, setQueuedActions] = useState<QueuedAction[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Function to handle the online status
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "You're back online!",
        description: queuedActions.length > 0 
          ? `${queuedActions.length} pending actions will now be processed.`
          : "Your connection has been restored.",
      });
      executeQueuedActions();
    };

    // Function to handle the offline status
    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "You're offline",
        description: "Actions will be queued until your connection is restored.",
        variant: "destructive",
      });
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Clean up event listeners
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queuedActions.length, toast]);

  // Add an action to the queue
  const addQueuedAction = (action: Omit<QueuedAction, 'id'>) => {
    const newAction: QueuedAction = {
      ...action,
      id: Math.random().toString(36).substring(2, 9),
    };
    
    setQueuedActions(prevActions => [...prevActions, newAction]);
    
    toast({
      title: "Action queued",
      description: "This action will be completed when you're back online.",
    });
  };

  // Execute all queued actions
  const executeQueuedActions = async () => {
    if (queuedActions.length === 0 || !isOnline) return;

    const actionsToExecute = [...queuedActions];
    setQueuedActions([]);

    for (const action of actionsToExecute) {
      try {
        await action.execute();
        toast({
          title: "Queued action completed",
          description: `Successfully processed: ${action.type}`,
        });
      } catch (error) {
        console.error("Failed to execute queued action:", error);
        toast({
          title: "Action failed",
          description: "Failed to complete a queued action. Please try again.",
          variant: "destructive",
        });
        
        // Add the failed action back to the queue
        setQueuedActions(prev => [...prev, action]);
      }
    }
  };

  return (
    <NetworkContext.Provider value={{ 
      isOnline, 
      queuedActions, 
      addQueuedAction, 
      executeQueuedActions 
    }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}
