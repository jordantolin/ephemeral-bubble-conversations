
import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useSpring, animated } from '@react-spring/three';
import { Text } from 'troika-three-text';
import { BubbleData } from '@/types/bubble';
import { createBubbleMaterial } from '@/utils/bubbleUtils';

interface BubbleCard3DProps {
  bubble: BubbleData;
  isActive: boolean;
  index: number;
  currentIndex: number;
}

const BubbleCard3D = ({ bubble, isActive, index, currentIndex }: BubbleCard3DProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const textRef = useRef<THREE.Group>(null);
  const distance = index - currentIndex;
  
  // Calculate position based on current index
  const spring = useSpring({
    position: [0, distance * -4, isActive ? 0 : -3] as [number, number, number],
    scale: isActive ? 1 : 0.8,
    opacity: isActive ? 1 : 0.6,
    config: { mass: 1, tension: 280, friction: 60 }
  });

  // Create bubble geometry for rendering
  useEffect(() => {
    if (!meshRef.current) return;

    // Update bubble appearance when active state changes
    const material = meshRef.current.material as THREE.MeshPhysicalMaterial;
    material.opacity = isActive ? 0.8 : 0.4;
    material.transmission = isActive ? 0.3 : 0.1;
    
    // Add gentle floating animation
    const animate = () => {
      if (!meshRef.current) return;
      meshRef.current.rotation.y += 0.002;
      meshRef.current.position.y = Math.sin(Date.now() * 0.001) * 0.05;
      requestAnimationFrame(animate);
    };
    
    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isActive]);

  return (
    <animated.mesh
      ref={meshRef}
      position={spring.position as any}
      scale={spring.scale as any}
    >
      {/* Bubble mesh */}
      <sphereGeometry args={[1.5, 32, 32]} />
      <meshPhysicalMaterial
        color={0xFFD700}
        transparent={true}
        opacity={0.8}
        metalness={0.3}
        roughness={0.1}
        transmission={0.3}
        thickness={0.8}
        clearcoat={1.0}
        clearcoatRoughness={0.1}
      />
      
      {/* Content container */}
      <group ref={textRef} position={[0, 0, 1.51]}>
        {/* We'll use HTML overlay for actual content rendering */}
      </group>
    </animated.mesh>
  );
};

export default BubbleCard3D;
