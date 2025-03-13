
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

interface Earth3DProps {
  scale?: number;
  rotationSpeed?: number;
}

const Earth3D: React.FC<Earth3DProps> = ({ 
  scale = 1, 
  rotationSpeed = 0.002 
}) => {
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  // Earth rotation animation
  useFrame(() => {
    if (earthRef.current) {
      earthRef.current.rotation.y += rotationSpeed;
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += rotationSpeed * 1.1;
    }
  });
  
  return (
    <group scale={scale}>
      {/* Earth sphere */}
      <Sphere ref={earthRef} args={[1, 64, 32]}>
        <meshPhongMaterial
          map={new THREE.TextureLoader().load('/textures/earth/earth_daymap.jpg')}
          bumpMap={new THREE.TextureLoader().load('/textures/earth/earth_bump.jpg')}
          bumpScale={0.05}
          specularMap={new THREE.TextureLoader().load('/textures/earth/earth_specular.jpg')}
          shininess={5}
        />
      </Sphere>
      
      {/* Clouds layer */}
      <Sphere ref={cloudsRef} args={[1.01, 48, 24]}>
        <meshPhongMaterial
          map={new THREE.TextureLoader().load('/textures/earth/earth_clouds.jpg')}
          transparent={true}
          opacity={0.4}
          depthWrite={false}
        />
      </Sphere>
      
      {/* Atmosphere glow */}
      <Sphere args={[1.1, 32, 16]}>
        <meshPhongMaterial
          color="#77adff"
          transparent={true}
          opacity={0.1}
          side={THREE.BackSide}
        />
      </Sphere>
    </group>
  );
};

export default Earth3D;
