
import React, { Suspense, useState, useEffect } from 'react';
import { BubbleWorldProps } from '@/types/bubble';
import { Loader2 } from 'lucide-react';

// Lazy load the heavy Three.js component with improved performance
const BubbleWorld = React.lazy(() => 
  import('@/components/BubbleWorld').then(module => {
    // Simulate a minimal delay for better UX - prevents flickering for fast loads
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(module);
      }, 100);
    });
  })
);

interface LazyBubbleWorldState {
  hasError: boolean;
  errorMessage: string | null;
}

/**
 * Enhanced lazy-loaded wrapper for the BubbleWorld component 
 * with improved loading states, error handling, and performance
 */
const LazyBubbleWorld = (props: BubbleWorldProps) => {
  const [state, setState] = useState<LazyBubbleWorldState>({ 
    hasError: false,
    errorMessage: null
  });
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // Reset error state if props change significantly
  useEffect(() => {
    if (state.hasError && props.topics.length > 0) {
      setState({ hasError: false, errorMessage: null });
    }
    
    // Track first load completion
    if (isFirstLoad && props.topics.length > 0) {
      setIsFirstLoad(false);
    }
  }, [props.topics, state.hasError, isFirstLoad]);

  // Error boundary functionality
  const handleError = (error: Error) => {
    console.error('Error loading BubbleWorld:', error);
    setState({ 
      hasError: true, 
      errorMessage: 'Failed to load the bubble visualization. Please try refreshing the page.'
    });
  };

  if (state.hasError) {
    return (
      <div className="w-full h-full min-h-[500px] flex items-center justify-center bg-[#FEF7E4]/50 rounded-2xl border-2 border-[#ebbd34]/20">
        <div className="flex flex-col items-center gap-4 max-w-md text-center p-6">
          <div className="bg-amber-100 p-3 rounded-full">
            <Loader2 className="h-8 w-8 text-amber-500" />
          </div>
          <p className="text-amber-700 font-medium text-lg">Oops! Something went wrong</p>
          <p className="text-amber-600 text-sm">{state.errorMessage}</p>
          <button 
            onClick={() => setState({ hasError: false, errorMessage: null })}
            className="mt-2 px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="w-full h-full min-h-[500px] flex items-center justify-center bg-[#FEF7E4]/50 rounded-2xl border-2 border-[#ebbd34]/20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-yellow-500 animate-spin" />
          <p className="text-yellow-500 font-medium">
            {isFirstLoad ? 'Creating your bubble world...' : 'Loading bubbles...'}
          </p>
        </div>
      </div>
    }>
      <ErrorBoundary onError={handleError}>
        <BubbleWorld {...props} />
      </ErrorBoundary>
    </Suspense>
  );
};

// Simple error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return null; // Parent component will handle the error UI
    }
    return this.props.children;
  }
}

export default LazyBubbleWorld;
