
import React from 'react';
import HeartfeltConnections from './HeartfeltConnections';
import { toast } from 'sonner';

const HeartfeltDemo = () => {
  const handleNodeClick = (node: any) => {
    toast.success(`Connection selected: ${node.name}`, {
      description: `${node.type} connection in ${node.location}`,
      position: 'top-right',
    });
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-gray-800">Heartfelt Connections</h1>
        <p className="text-md text-gray-600 mt-2">
          An interactive visualization of meaningful relationships in your life
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-700">Your Connection Network</h2>
          <p className="text-sm text-gray-500">
            Click on any node to see details about the relationship
          </p>
        </div>
        
        <div className="h-[600px]">
          <HeartfeltConnections 
            onNodeClick={handleNodeClick}
          />
        </div>
      </div>
      
      <div className="mt-6 text-center text-sm text-gray-600">
        <p>The visualization shows your most important connections in a heart-shaped network.</p>
        <p className="mt-1">Node size represents relationship significance, colors represent relationship types.</p>
      </div>
    </div>
  );
};

export default HeartfeltDemo;
