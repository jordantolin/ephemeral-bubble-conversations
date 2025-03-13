
import React from 'react';
import BubbleWorld3D from '@/components/earth/BubbleWorld3D';
import NavigationBar from '@/components/bubbleWorld/NavigationBar';

const BubbleEarth: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-secondary/20 overflow-hidden relative">
      <NavigationBar searchQuery="" setSearchQuery={() => {}} />
      
      <div className="pt-24 md:pt-28 pb-20 md:pb-16 px-4 sm:px-6 relative z-10">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-primary">Bubble Earth</h1>
            <p className="text-gray-600 mt-2">Explore conversations around the globe</p>
          </div>
          
          {/* 3D Earth component */}
          <div className="bg-white/50 backdrop-blur-sm rounded-xl shadow-lg p-4 md:p-6 h-[500px]">
            <BubbleWorld3D />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BubbleEarth;
