
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

interface Earth3DProps {
  position?: [number, number, number];
  scale?: number;
  rotationSpeed?: number;
}

const Earth3D: React.FC<Earth3DProps> = ({
  position = [0, 0, 0],
  scale = 1,
  rotationSpeed = 0.005
}) => {
  const earthRef = useRef<THREE.Mesh>(null);
  
  // Rotate the earth
  useFrame(() => {
    if (earthRef.current) {
      earthRef.current.rotation.y += rotationSpeed;
    }
  });

  return (
    <group position={new THREE.Vector3(...position)} scale={scale}>
      {/* Earth sphere */}
      <Sphere ref={earthRef} args={[1, 64, 32]}>
        <meshPhongMaterial 
          color="#3498db" 
          emissive="#2980b9"
          emissiveIntensity={0.2}
          specular="#ffffff"
          shininess={10}
        />
      </Sphere>
      
      {/* Simple atmosphere effect */}
      <Sphere args={[1.05, 32, 16]}>
        <meshPhongMaterial
          color="#87CEEB"
          transparent
          opacity={0.3}
          side={THREE.BackSide}
        />
      </Sphere>
      
      {/* Ambient light */}
      <ambientLight intensity={0.5} />
      
      {/* Directional light (sun) */}
      <directionalLight position={[5, 3, 5]} intensity={1} />
    </group>
  );
};

export default Earth3D;
