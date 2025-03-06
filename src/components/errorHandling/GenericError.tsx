
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GenericErrorProps {
  title?: string;
  description?: string;
  error?: Error | string;
  onRetry?: () => void;
  retryLabel?: string;
}

const GenericError: React.FC<GenericErrorProps> = ({
  title = "Oops! Something went wrong",
  description = "We encountered an unexpected error. Please try refreshing the page.",
  error,
  onRetry,
  retryLabel = "Try Again"
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <AlertTriangle className="h-16 w-16 text-[#ebbd34] mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-[#ebbd34] mb-4 text-center">{title}</h2>
        <p className="text-gray-600 mb-6 text-center">
          {description}
        </p>
        {error && (
          <div className="bg-red-50 p-4 rounded-md border border-red-200 mb-6 overflow-auto max-h-32">
            <p className="font-mono text-sm text-red-600 break-words">
              {typeof error === 'string' ? error : error.message || error.toString()}
            </p>
          </div>
        )}
        {onRetry && (
          <div className="flex justify-center">
            <Button 
              onClick={onRetry}
              className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white"
            >
              {retryLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenericError;
