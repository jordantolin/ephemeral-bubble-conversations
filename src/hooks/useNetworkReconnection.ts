
import { useState, useEffect } from 'react';
import { useNetwork } from '@/context/NetworkContext';

export const useNetworkReconnection = () => {
  const { isOnline } = useNetwork();
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [previousOnlineState, setPreviousOnlineState] = useState(isOnline);

  useEffect(() => {
    // If we were offline and now we're online, show reconnecting state
    if (!previousOnlineState && isOnline) {
      setIsReconnecting(true);
      
      // Hide reconnecting indicator after 3 seconds
      const timer = setTimeout(() => {
        setIsReconnecting(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
    
    setPreviousOnlineState(isOnline);
  }, [isOnline, previousOnlineState]);

  return { isReconnecting };
};
