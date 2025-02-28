
import React from 'react';

const Loading = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC]">
      <div className="w-16 h-16 border-4 border-[#ebbd34]/20 border-t-[#ebbd34] rounded-full animate-spin"></div>
      <p className="mt-4 text-[#ebbd34] font-medium">Loading...</p>
    </div>
  );
};

export default Loading;
