
import { useState, useEffect, useCallback } from 'react';
import { useNetwork } from '@/context/NetworkContext';
import { useToast } from '@/hooks/use-toast';
import { isBrowserOnline } from '@/utils/networkUtils';

export const useNetworkReconnection = () => {
  const { isOnline } = useNetwork();
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [previousOnlineState, setPreviousOnlineState] = useState(isOnline);
  const { toast } = useToast();

  // Check browser's online status directly
  const checkOnlineStatus = useCallback(() => {
    return isBrowserOnline();
  }, []);

  useEffect(() => {
    // If we were offline and now we're online, show reconnecting state
    if (!previousOnlineState && isOnline) {
      setIsReconnecting(true);
      
      toast({
        title: "Reconnected",
        description: "You're back online. Refreshing your data...",
      });
      
      // Hide reconnecting indicator after 3 seconds
      const timer = setTimeout(() => {
        setIsReconnecting(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
    
    // If we just went offline, show toast
    if (previousOnlineState && !isOnline) {
      toast({
        title: "You're offline",
        description: "Waiting for connection to resume",
        variant: "destructive"
      });
    }
    
    setPreviousOnlineState(isOnline);
  }, [isOnline, previousOnlineState, toast]);

  // Additional check on component mount to ensure we have accurate connection state
  useEffect(() => {
    const initialOnlineStatus = checkOnlineStatus();
    setPreviousOnlineState(initialOnlineStatus);
    
    // Set up periodic connection checks
    const checkConnectionInterval = setInterval(() => {
      const currentOnlineStatus = checkOnlineStatus();
      
      // If status changed from offline to online
      if (!previousOnlineState && currentOnlineStatus) {
        setIsReconnecting(true);
        setTimeout(() => setIsReconnecting(false), 3000);
      }
      
      setPreviousOnlineState(currentOnlineStatus);
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(checkConnectionInterval);
  }, [checkOnlineStatus, previousOnlineState]);

  return { isReconnecting };
};
