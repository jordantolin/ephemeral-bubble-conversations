
import { useState, useCallback } from 'react';
import { useNetwork } from '@/context/NetworkContext';
import { useToast } from '@/components/ui/use-toast';

/**
 * A hook that handles requests with offline awareness,
 * queuing them when offline and executing them when back online.
 */
export function useOfflineAwareRequest<T>() {
  const { isOnline, addQueuedAction } = useNetwork();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const executeRequest = useCallback(
    async (
      requestFn: () => Promise<T>,
      options: {
        actionType: string;
        payload?: any;
        onSuccess?: (data: T) => void;
        onError?: (error: any) => void;
        successMessage?: string;
        errorMessage?: string;
        skipOfflineCheck?: boolean;
      }
    ) => {
      const {
        actionType,
        payload,
        onSuccess,
        onError,
        successMessage,
        errorMessage,
        skipOfflineCheck = false,
      } = options;

      // If we're offline and not skipping the check, queue the action
      if (!isOnline && !skipOfflineCheck) {
        addQueuedAction({
          type: actionType,
          payload,
          timestamp: Date.now(),
          // Ensure this returns Promise<void> to match QueuedAction type
          execute: async () => {
            try {
              const result = await requestFn();
              onSuccess?.(result);
              if (successMessage) {
                toast({
                  title: 'Success',
                  description: successMessage,
                });
              }
            } catch (error) {
              onError?.(error);
              if (errorMessage) {
                toast({
                  title: 'Error',
                  description: errorMessage,
                  variant: 'destructive',
                });
              }
            }
          },
        });
        return null as unknown as T; // Type assertion needed for consistent return
      }

      // If we're online or skipping the check, execute immediately
      setIsLoading(true);
      try {
        const result = await requestFn();
        if (successMessage) {
          toast({
            title: 'Success',
            description: successMessage,
          });
        }
        onSuccess?.(result);
        return result;
      } catch (error) {
        if (errorMessage) {
          toast({
            title: 'Error',
            description: errorMessage,
            variant: 'destructive',
          });
        }
        onError?.(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [isOnline, addQueuedAction, toast]
  );

  return { executeRequest, isLoading };
}
