
import { useState } from "react";
import { useNetwork } from "@/context/NetworkContext";

interface RequestOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: any) => void;
  actionType: string;
  actionDescription?: string;
}

export function useOfflineAwareRequest() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const { isOnline, addQueuedAction } = useNetwork();

  const executeRequest = async <T>(
    requestFn: () => Promise<T>,
    options: RequestOptions<T>
  ): Promise<T | undefined> => {
    setIsLoading(true);
    setError(null);

    try {
      if (!isOnline) {
        // Queue the action for later execution
        addQueuedAction({
          type: options.actionType,
          payload: null,
          timestamp: Date.now(),
          execute: async () => {
            try {
              const result = await requestFn();
              options.onSuccess?.(result);
              // This function must return void to match the QueuedAction type
              return;
            } catch (err) {
              options.onError?.(err);
              throw err;
            }
          },
        });
        setIsLoading(false);
        return undefined;
      }

      // Execute immediately if online
      const result = await requestFn();
      options.onSuccess?.(result);
      return result;
    } catch (err) {
      setError(err);
      options.onError?.(err);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    executeRequest,
    isLoading,
    error
  };
}
