
import React, { Suspense } from 'react';
import { BubbleWorldProps } from '@/types/bubble';
import { Loader2 } from 'lucide-react';

// Lazy load the heavy Three.js component
const BubbleWorld = React.lazy(() => import('@/components/BubbleWorld'));

/**
 * Lazy-loaded wrapper for the BubbleWorld component with a suspense fallback
 */
const LazyBubbleWorld = (props: BubbleWorldProps) => {
  return (
    <Suspense fallback={
      <div className="w-full h-full min-h-[500px] flex items-center justify-center bg-[#FEF7E4]/50 rounded-full border-2 border-[#ebbd34]/20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-yellow-500 animate-spin" />
          <p className="text-yellow-500 font-medium">Loading Bubble World...</p>
        </div>
      </div>
    }>
      <BubbleWorld {...props} />
    </Suspense>
  );
};

export default LazyBubbleWorld;
