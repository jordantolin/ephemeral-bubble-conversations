
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { BubbleData } from '@/types/bubble';

interface BubbleProps {
  name: string;
  topic: string;
  size: number;
  position: [number, number, number];
  onClick: () => void;
}

interface BubbleWorldProps {
  topics: BubbleData[];
  onBubbleClick: (bubbleId: string) => void;
}

// This component creates the text label for a bubble
const createTextCanvas = (text: string): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return canvas;
  
  canvas.width = 256;
  canvas.height = 128;
  
  // Clear background
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add text with shadow for better visibility
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  
  return canvas;
};

// Individual bubble component
const Bubble = ({ name, topic, size, position, onClick }: BubbleProps) => {
  const mesh = useRef<THREE.Mesh>(null);
  const textTexture = new THREE.CanvasTexture(createTextCanvas(topic));
  
  // Simple animation
  useFrame(({ clock }) => {
    if (mesh.current) {
      mesh.current.position.y += Math.sin(clock.getElapsedTime() + position[0]) * 0.002;
    }
  });
  
  return (
    <mesh
      ref={mesh}
      position={position}
      onClick={onClick}
    >
      <sphereGeometry args={[size, 32, 32]} />
      <meshPhysicalMaterial
        color={0xebbd34}
        metalness={0.1}
        roughness={0.05}
        transmission={0.7}
        reflectivity={0.6}
        clearcoat={1.0}
        clearcoatRoughness={0.1}
        transparent={true}
        opacity={0.7}
      />
      <mesh position={[0, size + 0.3, 0]}>
        <planeGeometry args={[size * 2, size * 0.8]} />
        <meshBasicMaterial 
          map={textTexture} 
          transparent={true} 
          side={THREE.DoubleSide} 
        />
      </mesh>
    </mesh>
  );
};

// Central world/hub
const CentralWorld = () => {
  const mesh = useRef<THREE.Mesh>(null);
  
  useFrame(({ clock }) => {
    if (mesh.current) {
      mesh.current.rotation.y = clock.getElapsedTime() * 0.1;
    }
  });
  
  return (
    <mesh ref={mesh}>
      <icosahedronGeometry args={[1, 1]} />
      <meshPhysicalMaterial 
        color={0xebbd34}
        wireframe={true}
        metalness={0.5}
        roughness={0.2}
        transmission={0.3}
        clearcoat={1.0}
        clearcoatRoughness={0.1}
        emissive={0x332200}
        emissiveIntensity={0.3}
        transparent={true}
        opacity={0.7}
      />
    </mesh>
  );
};

// Main scene component
const BubbleScene = ({ topics, onBubbleClick }: BubbleWorldProps) => {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      
      <CentralWorld />
      
      {topics.map((topic, index) => {
        // Calculate position using simple distribution algorithm
        const angle = (index / topics.length) * Math.PI * 2;
        const radius = 3 + Math.random() * 0.5;
        const x = Math.cos(angle) * radius;
        const y = (Math.random() - 0.5) * 2;
        const z = Math.sin(angle) * radius;
        
        // Calculate size based on reflection count
        const bubbleSize = topic.reflect_count > 5 ? 
          0.8 + (topic.reflect_count / 20) : 0.8;
        
        return (
          <Bubble
            key={topic.id}
            name={topic.name}
            topic={topic.topic}
            size={bubbleSize}
            position={[x, y, z]}
            onClick={() => onBubbleClick(topic.id)}
          />
        );
      })}
      
      <OrbitControls 
        enablePan={false}
        minDistance={3}
        maxDistance={7}
      />
    </>
  );
};

// Main component with error handling
const BubbleWorld: React.FC<BubbleWorldProps> = ({ topics, onBubbleClick }) => {
  const [error, setError] = useState<string | null>(null);
  
  // Error handler for Canvas errors
  const handleCanvasErrors = () => {
    console.error("BubbleWorld canvas error occurred");
    setError("Failed to render 3D visualization");
  };
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-[65vh] sm:h-[75vh] min-h-[400px] sm:min-h-[500px] w-full bg-white/30 rounded-2xl backdrop-blur-sm p-2 sm:p-3 shadow-lg border border-[#ebbd34]/10 relative">
        <div className="text-center p-6 bg-white/80 rounded-lg shadow-sm">
          <h3 className="text-xl font-medium text-red-600 mb-3">Oops, something went wrong!</h3>
          <p className="text-gray-600 mb-4">There was a problem with the 3D visualization.</p>
          <button 
            onClick={() => setError(null)} 
            className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white py-2 px-4 rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <Canvas 
      camera={{ position: [0, 0, 5], fov: 50 }}
      onCreated={(state) => {
        state.gl.setClearColor(new THREE.Color(0xfef7e4), 0);
      }}
      onError={handleCanvasErrors}
    >
      <BubbleScene topics={topics} onBubbleClick={onBubbleClick} />
    </Canvas>
  );
};

export default BubbleWorld;
