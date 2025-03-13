
import React, { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import Earth3D from './Earth3D';
import * as THREE from 'three';
import { useCameraControls } from '@/hooks/useCameraControls';

interface BubbleWorld3DProps {
  className?: string;
  onRegionSelect?: (region: string) => void;
}

// Custom camera controller component
const CameraController = () => {
  const { camera, gl } = useThree();
  const {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    updateCamera,
    zoomRef
  } = useCameraControls();
  
  const domElement = gl.domElement;
  
  // Set up event listeners
  useEffect(() => {
    domElement.addEventListener('mousedown', handleMouseDown);
    domElement.addEventListener('mousemove', handleMouseMove);
    domElement.addEventListener('mouseup', handleMouseUp);
    domElement.addEventListener('wheel', handleWheel);

    return () => {
      domElement.removeEventListener('mousedown', handleMouseDown);
      domElement.removeEventListener('mousemove', handleMouseMove);
      domElement.removeEventListener('mouseup', handleMouseUp);
      domElement.removeEventListener('wheel', handleWheel);
    };
  }, [domElement, handleMouseDown, handleMouseMove, handleMouseUp, handleWheel]);

  // Update camera position every frame
  useFrame(() => {
    updateCamera(camera);
  });

  return null;
};

// Helper component for loading state
const LoadingIndicator = () => (
  <Html center>
    <div className="text-white text-center bg-black/50 p-3 rounded-lg backdrop-blur-sm">
      <div className="animate-spin w-8 h-8 border-4 border-t-primary rounded-full mx-auto mb-2"></div>
      <p>Loading Earth...</p>
    </div>
  </Html>
);

const BubbleWorld3D: React.FC<BubbleWorld3DProps> = ({ className, onRegionSelect }) => {
  const [isReady, setIsReady] = useState(false);
  const sceneRef = useRef<THREE.Scene | null>(null);
  
  // Handle scene ready state
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`w-full h-full ${className || ''} relative`}>
      <Canvas 
        shadows
        camera={{ position: [0, 0, 5], fov: 45, near: 0.1, far: 1000 }}
        gl={{ antialias: true }}
        onCreated={({ scene }) => {
          sceneRef.current = scene;
          scene.background = new THREE.Color(0x000515);
        }}
      >
        <Suspense fallback={<LoadingIndicator />}>
          {/* Ambient light for overall illumination */}
          <ambientLight intensity={0.2} />
          
          {/* Main directional light (sun) */}
          <directionalLight 
            position={[5, 3, 5]} 
            intensity={1.5} 
            castShadow 
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          
          {/* Background stars */}
          <Stars 
            radius={100} 
            depth={50} 
            count={7000} 
            factor={4} 
            saturation={0.5}
            fade 
            speed={0.5} 
          />
          
          {/* Earth model */}
          <Earth3D 
            scale={1.5} 
            rotationSpeed={0.0005}
            showClouds={true}
            showAtmosphere={true}
            axialTilt={23.5}
          />
          
          {/* Camera controls */}
          <CameraController />
        </Suspense>
      </Canvas>
      
      {/* Optional UI overlay */}
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="text-white text-center">
            <div className="animate-spin w-12 h-12 border-4 border-t-primary rounded-full mx-auto mb-4"></div>
            <h3 className="text-xl font-bold">Preparing Earth View</h3>
            <p className="text-sm opacity-80 mt-2">Loading high-resolution textures...</p>
          </div>
        </div>
      )}
      
      {/* Reset view button */}
      <button 
        className="absolute bottom-4 right-4 bg-white/10 backdrop-blur-sm text-white px-3 py-1.5 rounded-md text-sm hover:bg-white/20 transition-colors"
        onClick={() => {
          // Reset view logic would go here
        }}
      >
        Reset View
      </button>
    </div>
  );
};

export default BubbleWorld3D;
