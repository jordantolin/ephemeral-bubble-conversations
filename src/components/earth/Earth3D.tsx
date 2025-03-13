
import React, { useRef, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';

// Earth texture maps
import earthDayMap from '/textures/earth_daymap.jpg';
import earthNormalMap from '/textures/earth_normal.jpg';
import earthSpecularMap from '/textures/earth_specular.jpg';
import earthCloudsMap from '/textures/earth_clouds.jpg';

interface Earth3DProps {
  position?: [number, number, number];
  scale?: number;
  rotationSpeed?: number;
  showClouds?: boolean;
  showAtmosphere?: boolean;
  axialTilt?: number;
}

const Earth3D: React.FC<Earth3DProps> = ({
  position = [0, 0, 0],
  scale = 1,
  rotationSpeed = 0.001,
  showClouds = true,
  showAtmosphere = true,
  axialTilt = 23.5
}) => {
  // Load Earth textures
  const [colorMap, normalMap, specularMap, cloudsMap] = useLoader(TextureLoader, [
    earthDayMap,
    earthNormalMap,
    earthSpecularMap,
    earthCloudsMap
  ]);

  // Create refs for animation
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  
  // Set initial Earth tilt
  useEffect(() => {
    if (earthRef.current) {
      // Convert axial tilt from degrees to radians
      const tiltInRadians = (axialTilt * Math.PI) / 180;
      earthRef.current.rotation.x = tiltInRadians;
    }
  }, [axialTilt]);
  
  // Rotate the Earth and clouds
  useFrame(() => {
    if (earthRef.current) {
      earthRef.current.rotation.y += rotationSpeed;
    }
    if (cloudsRef.current && showClouds) {
      // Clouds rotate slightly faster for subtle effect
      cloudsRef.current.rotation.y += rotationSpeed * 1.1;
    }
  });

  return (
    <group position={new THREE.Vector3(...position)} scale={scale}>
      {/* Earth sphere */}
      <Sphere ref={earthRef} args={[1, 64, 64]} receiveShadow castShadow>
        <meshPhongMaterial 
          map={colorMap}
          normalMap={normalMap}
          specularMap={specularMap}
          shininess={10}
          specular={new THREE.Color(0x333333)}
        />
      </Sphere>
      
      {/* Cloud layer */}
      {showClouds && (
        <Sphere ref={cloudsRef} args={[1.02, 64, 64]}>
          <meshPhongMaterial 
            map={cloudsMap}
            transparent={true}
            opacity={0.4}
            depthWrite={false}
          />
        </Sphere>
      )}
      
      {/* Atmospheric glow effect */}
      {showAtmosphere && (
        <Sphere ref={atmosphereRef} args={[1.1, 64, 32]} scale={[1.1, 1.1, 1.1]}>
          <meshPhongMaterial
            color="#add8e6"
            side={THREE.BackSide}
            transparent={true}
            opacity={0.3}
          />
        </Sphere>
      )}
    </group>
  );
};

export default Earth3D;
