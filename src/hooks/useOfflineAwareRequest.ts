
import { useState } from "react";
import { useNetwork } from "@/context/NetworkContext";

interface RequestOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: any) => void;
  actionType: string;
  actionDescription?: string;
}

export function useOfflineAwareRequest() {
  const { isOnline, addQueuedAction } = useNetwork();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const executeRequest = async <T>(
    requestFn: () => Promise<T>,
    options: RequestOptions<T>
  ): Promise<T | undefined> => {
    setIsLoading(true);
    setError(null);

    try {
      if (!isOnline) {
        // Queue the request if offline
        addQueuedAction({
          type: options.actionType,
          payload: options.actionDescription || "Queued request",
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
      setIsLoading(false);
      return result;
    } catch (err) {
      console.error("Request failed:", err);
      setError(err);
      options.onError?.(err);
      setIsLoading(false);
      return undefined;
    }
  };

  return { executeRequest, isLoading, error };
}
