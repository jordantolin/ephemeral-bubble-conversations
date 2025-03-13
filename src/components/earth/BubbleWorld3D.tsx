
import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import Earth3D from './Earth3D';

interface BubbleWorld3DProps {
  className?: string;
}

const BubbleWorld3D: React.FC<BubbleWorld3DProps> = ({ className }) => {
  return (
    <div className={`w-full h-full ${className || ''}`}>
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <Suspense fallback={null}>
          {/* Background stars */}
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          
          {/* Earth model */}
          <Earth3D scale={1.5} />
          
          {/* Camera controls */}
          <OrbitControls 
            enableZoom={true}
            enablePan={false}
            minDistance={3}
            maxDistance={10}
            rotateSpeed={0.5}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default BubbleWorld3D;
