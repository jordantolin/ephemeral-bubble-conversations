
import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import Earth3D from './Earth3D';
import { useCameraControls } from '@/hooks/useCameraControls';

interface BubbleData {
  id: string;
  position: [number, number, number];
  color: string;
  size: number;
  name: string;
}

interface BubbleWorld3DProps {
  bubbles?: BubbleData[];
}

const BubbleWorld3D: React.FC<BubbleWorld3DProps> = ({ bubbles = [] }) => {
  const {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
    handleWheel,
    updateCamera
  } = useCameraControls();

  return (
    <Canvas
      className="cursor-grab active:cursor-grabbing"
      camera={{ position: [0, 0, 16], fov: 45 }}
      onCreated={({ gl }) => {
        gl.setClearColor(new THREE.Color('#00000000'), 0);
      }}
      shadows
      onMouseDown={(e) => handleMouseDown(e.nativeEvent)}
      onMouseMove={(e) => handleMouseMove(e.nativeEvent)}
      onMouseUp={(e) => handleMouseUp()}
      onDoubleClick={(e) => handleDoubleClick()}
      onWheel={(e) => handleWheel(e.nativeEvent)}
    >
      {/* Ambient light and directional light for the scene */}
      <ambientLight intensity={0.5} />
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
        count={5000} 
        factor={4} 
        saturation={0} 
        fade 
      />
      
      {/* Earth as central element */}
      <Earth3D 
        position={[0, 0, 0]}
        scale={1.5}
        rotationSpeed={0.0005}
        showClouds={true}
        showAtmosphere={true}
      />
      
      {/* Orbiting bubbles */}
      {bubbles.map((bubble) => (
        <Bubble 
          key={bubble.id}
          position={bubble.position}
          color={bubble.color}
          size={bubble.size}
          name={bubble.name}
        />
      ))}
      
      {/* Camera controller */}
      <CameraController updateCamera={updateCamera} />
    </Canvas>
  );
};

// Bubble component for orbiting elements
const Bubble: React.FC<{
  position: [number, number, number];
  color: string;
  size: number;
  name: string;
}> = ({ position, color, size, name }) => {
  const ref = useRef<THREE.Group>(null);
  
  return (
    <group ref={ref} position={position}>
      <mesh castShadow>
        <sphereGeometry args={[size, 32, 32]} />
        <meshPhysicalMaterial 
          color={color}
          transmission={0.6}
          thickness={1.5}
          roughness={0.2}
          metalness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.2}
          opacity={0.8}
          transparent
        />
      </mesh>
      
      {/* Text label */}
      <Html position={[0, size + 0.5, 0]} center>
        <div className="text-white text-sm bg-black/50 px-2 py-1 rounded whitespace-nowrap">
          {name}
        </div>
      </Html>
    </group>
  );
};

// Helper component for the Html elements from drei
const Html: React.FC<{
  children: React.ReactNode;
  position: [number, number, number];
  center?: boolean;
}> = ({ children, position, center }) => {
  const ref = useRef<THREE.Group>(null);
  
  return (
    <group ref={ref} position={position}>
      <div
        style={{
          transform: center ? 'translate(-50%, -50%)' : 'none',
          pointerEvents: 'none',
        }}
      >
        {children}
      </div>
    </group>
  );
};

// Helper component to update camera on each frame
const CameraController: React.FC<{ updateCamera: (camera: THREE.Camera) => void }> = ({ updateCamera }) => {
  return null;
};

export default BubbleWorld3D;
