
import React from 'react';
import { Loader2 } from "lucide-react";

const BubblesLoading: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="w-10 h-10 text-[#ebbd34] animate-spin mb-4" />
      <p className="text-[#ebbd34]">Loading your bubbles...</p>
    </div>
  );
};

export default BubblesLoading;
