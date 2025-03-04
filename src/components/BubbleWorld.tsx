import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';
import { createTextCanvas, applyRepulsionForce, applyOrbitalMotion, calculateMinDistance } from '@/utils/bubbleUtils';
import { BubbleData } from '@/types/bubble';

interface BubbleProps {
  name: string;
  topic: string;
  size: number;
  x: number;
  y: number;
  z: number;
  onClick: () => void;
}

interface BubbleWorldProps {
  topics: BubbleData[];
  onBubbleClick: (bubbleId: string) => void;
}

const Bubble: React.FC<BubbleProps> = ({ name, topic, size, x, y, z, onClick }) => {
  const mesh = useRef<THREE.Mesh>(null);
  const textCanvas = createTextCanvas(topic, 24);
  const textTexture = new THREE.CanvasTexture(textCanvas);

  useEffect(() => {
    if (mesh.current) {
      mesh.current.geometry.dispose();
      mesh.current.geometry = new THREE.SphereGeometry(size, 32, 32);
    }
    textTexture.needsUpdate = true;
  }, [size, topic, textTexture]);

  return (
    <mesh
      ref={mesh}
      position={[x, y, z]}
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
        side={THREE.DoubleSide}
      />
      <mesh position={[0, size + 0.5, 0]}>
        <planeGeometry args={[size * 2, size * 1]} />
        <meshBasicMaterial map={textTexture} side={THREE.DoubleSide} transparent={true} opacity={1} />
      </mesh>
    </mesh>
  );
};

const CentralWorld: React.FC = () => {
  const { scene } = useGLTF('/models/central_world.glb');

  return <primitive object={scene} scale={0.8} />;
};

const BubbleWorld: React.FC<BubbleWorldProps> = ({ topics, onBubbleClick }) => {
  const bubbles = useRef<THREE.Vector3[]>([]);
  const repulsionStrengths = useRef<number[]>([]);
  const time = useRef(0);

  useFrame((state, delta) => {
    time.current += delta;

    // Apply orbital motion and repulsion forces
    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      const bubbleSize = topic.reflect_count > 5 ? topic.reflect_count / 5 + 0.8 : 0.8;
      const bubblePosition = bubbles.current[i];

      // Apply orbital motion
      const orbitalMotion = applyOrbitalMotion(
        bubblePosition,
        new THREE.Vector3(0, 0, 0),
        time.current,
        i,
        topics.length
      );
      bubblePosition.copy(orbitalMotion);

      // Apply repulsion forces
      for (let j = i + 1; j < topics.length; j++) {
        const otherTopic = topics[j];
        const otherBubbleSize = otherTopic.reflect_count > 5 ? otherTopic.reflect_count / 5 + 0.8 : 0.8;
        const otherBubblePosition = bubbles.current[j];

        const { moveA, moveB } = applyRepulsionForce(
          bubblePosition,
          otherBubblePosition,
          bubbleSize,
          otherBubbleSize,
          repulsionStrengths.current[i]
        );

        bubblePosition.add(moveA);
        otherBubblePosition.add(moveB);
      }
    }
  });

  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <CentralWorld />
      {topics.map((topic, index) => {
        const bubbleSize = topic.reflect_count > 5 ? topic.reflect_count / 5 + 0.8 : 0.8;
        if (!bubbles.current[index]) {
          bubbles.current[index] = new THREE.Vector3(
            Math.random() * 5 - 2.5,
            Math.random() * 3 - 1.5,
            Math.random() * 5 - 2.5
          );
          repulsionStrengths.current[index] = 0.05 + Math.random() * 0.1;
        }
        return (
          <Bubble
            key={topic.id}
            name={topic.name}
            topic={topic.topic}
            size={bubbleSize}
            x={bubbles.current[index].x}
            y={bubbles.current[index].y}
            z={bubbles.current[index].z}
            onClick={() => onBubbleClick(topic.id)}
          />
        );
      })}
      <OrbitControls enablePan={false} minDistance={3} maxDistance={7} />
    </Canvas>
  );
};

export default BubbleWorld;
