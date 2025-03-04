
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
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

// This component must be used inside Canvas
const Bubble = ({ name, topic, size, x, y, z, onClick }: BubbleProps) => {
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

// Fallback central world when model can't be loaded
const FallbackCentralWorld = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.1;
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
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
    </group>
  );
};

// This component must be used inside Canvas
const CentralWorld = () => {
  const [modelError, setModelError] = useState(false);
  
  // Handle model loading errors
  const onError = () => {
    console.error("Failed to load central_world.glb model, using fallback");
    setModelError(true);
  };
  
  try {
    // Only attempt to load the model if we haven't encountered an error yet
    if (!modelError) {
      const { scene } = useGLTF('/models/central_world.glb', undefined, onError);
      return <primitive object={scene} scale={0.8} />;
    }
  } catch (error) {
    console.error("Error loading central world model:", error);
    setModelError(true);
  }
  
  // Return fallback if there was an error
  return <FallbackCentralWorld />;
};

// Error boundary for the 3D scene
const ErrorBoundaryFallback = () => {
  return (
    <mesh>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="hotpink" />
      <Text position={[0, 0, 1.1]} fontSize={0.2} color="white">
        Error loading 3D scene
      </Text>
    </mesh>
  );
};

// Component to display loading text
const Text = ({ children, ...props }: any) => {
  const texture = useRef(new THREE.CanvasTexture(document.createElement('canvas')));
  
  useEffect(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = 512;
      canvas.height = 128;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'black';
      ctx.font = '60px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(children, canvas.width / 2, canvas.height / 2);
      
      texture.current.image = canvas;
      texture.current.needsUpdate = true;
    }
  }, [children]);
  
  return (
    <sprite {...props}>
      <spriteMaterial map={texture.current} />
    </sprite>
  );
};

// This component must be used inside Canvas
const BubbleScene = ({ topics, onBubbleClick }: BubbleWorldProps) => {
  const bubbles = useRef<THREE.Vector3[]>([]);
  const repulsionStrengths = useRef<number[]>([]);
  const time = useRef(0);

  useFrame((state, delta) => {
    time.current += delta;

    // Apply orbital motion and repulsion forces
    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      const bubbleSize = topic.reflect_count > 5 ? topic.reflect_count / 5 + 0.8 : 0.8;
      
      // Initialize bubble position if it doesn't exist
      if (!bubbles.current[i]) {
        bubbles.current[i] = new THREE.Vector3(
          Math.random() * 5 - 2.5,
          Math.random() * 3 - 1.5,
          Math.random() * 5 - 2.5
        );
        repulsionStrengths.current[i] = 0.05 + Math.random() * 0.1;
      }
      
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
        
        // Initialize other bubble position if it doesn't exist
        if (!bubbles.current[j]) {
          bubbles.current[j] = new THREE.Vector3(
            Math.random() * 5 - 2.5,
            Math.random() * 3 - 1.5,
            Math.random() * 5 - 2.5
          );
          repulsionStrengths.current[j] = 0.05 + Math.random() * 0.1;
        }
        
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
    <>
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
    </>
  );
};

// Main wrapper component with Canvas
const BubbleWorld: React.FC<BubbleWorldProps> = ({ topics, onBubbleClick }) => {
  const [error, setError] = useState<string | null>(null);
  
  // Global error handler for Canvas
  const handleCanvasErrors = (err: Error) => {
    console.error("BubbleWorld canvas error:", err);
    setError(err.message);
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
