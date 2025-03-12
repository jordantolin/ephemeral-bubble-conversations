
import React from 'react';
import { ConnectionNode, ConnectionLink } from '@/types/heartfelt';
import { Heart, MessagesSquare, Clock, Star, X } from 'lucide-react';

interface ConnectionDetailsProps {
  node: ConnectionNode;
  connections: {
    nodes: ConnectionNode[];
    links: ConnectionLink[];
  };
}

const ConnectionDetails: React.FC<ConnectionDetailsProps> = ({ node, connections }) => {
  // Find all links connected to this node
  const nodeLinks = connections.links.filter(
    link => link.source === node || link.target === node
  );
  
  // Get connected nodes
  const connectedNodes = nodeLinks.map(link => {
    const connectedNode = link.source === node ? link.target : link.source;
    return {
      node: connectedNode as ConnectionNode,
      link
    };
  });

  return (
    <div className="connection-details">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">{node.name}</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="flex flex-col">
          <span className="text-sm text-gray-500">Type</span>
          <span className="capitalize">{node.type}</span>
        </div>
        
        <div className="flex flex-col">
          <span className="text-sm text-gray-500">Location</span>
          <span>{node.location}</span>
        </div>
        
        <div className="flex flex-col">
          <span className="text-sm text-gray-500">Strength</span>
          <div className="flex items-center">
            <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
              <div 
                className="bg-pink-400 h-2 rounded-full" 
                style={{ width: `${(node.depth || 0.5) * 100}%` }}
              ></div>
            </div>
            <span>{Math.round((node.depth || 0.5) * 10)}/10</span>
          </div>
        </div>
        
        <div className="flex flex-col">
          <span className="text-sm text-gray-500">Last Contact</span>
          <span>{node.lastContact || 'Unknown'}</span>
        </div>
      </div>

      {node.description && (
        <div className="mb-3">
          <p className="text-sm">{node.description}</p>
        </div>
      )}

      {/* Timeline visualization */}
      <div className="mb-3">
        <h4 className="text-sm font-medium mb-1 flex items-center">
          <Clock className="w-4 h-4 mr-1" /> Relationship Timeline
        </h4>
        <div className="relative h-4 bg-gray-100 rounded">
          <div 
            className="absolute h-full bg-gradient-to-r from-pink-200 to-pink-400 rounded"
            style={{ width: `${(node.recency || 0.5) * 100}%` }}
          ></div>
          <div 
            className="absolute w-2 h-2 bg-pink-600 rounded-full top-1/2 -translate-y-1/2" 
            style={{ left: `${(node.recency || 0.5) * 100}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>First Met</span>
          <span>Now</span>
        </div>
      </div>

      {/* Connected relationships */}
      {connectedNodes.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-1 flex items-center">
            <Heart className="w-4 h-4 mr-1" /> Connected Relationships
          </h4>
          <ul className="text-sm">
            {connectedNodes.map(({ node: connectedNode, link }) => (
              <li key={connectedNode.id} className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0">
                <span>{connectedNode.name}</span>
                <div className="flex items-center">
                  <Star className="w-3 h-3 text-amber-400 mr-1" />
                  <span>{Math.round((link.strength || 0.5) * 10)}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Communication patterns */}
      <div className="mt-3">
        <h4 className="text-sm font-medium mb-1 flex items-center">
          <MessagesSquare className="w-4 h-4 mr-1" /> Communication
        </h4>
        <div className="grid grid-cols-4 gap-1 text-center">
          <div className="flex flex-col items-center">
            <div className="w-8 h-1 bg-blue-400 rounded"></div>
            <span className="text-xs mt-1">Texts</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-8 h-3 bg-green-400 rounded"></div>
            <span className="text-xs mt-1">Calls</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-8 h-2 bg-purple-400 rounded"></div>
            <span className="text-xs mt-1">Email</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-8 h-4 bg-amber-400 rounded"></div>
            <span className="text-xs mt-1">In Person</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionDetails;
