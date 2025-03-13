
import React, { useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useCameraControls } from '../hooks/useCameraControls';
import Earth3D from './Earth3D';
import { BubbleWorldProps } from '../types/bubble';
import '../App.css';

const BubbleWorld: React.FC<BubbleWorldProps> = ({ topics, onBubbleClick }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handlePinchZoom,
    updateCamera,
    mouseRef,
  } = useCameraControls();

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (canvasRef.current) {
      setDimensions({
        width: canvasRef.current.clientWidth,
        height: canvasRef.current.clientHeight,
      });
    }

    const handleResize = () => {
      if (canvasRef.current) {
        setDimensions({
          width: canvasRef.current.clientWidth,
          height: canvasRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle touch events for mobile
  useEffect(() => {
    const touchStartHandler = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleMouseDown({
          clientX: e.touches[0].clientX,
          clientY: e.touches[0].clientY,
        } as MouseEvent);
      } else if (e.touches.length === 2) {
        const distance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        mouseRef.current.lastPinchDistance = distance;
      }
    };

    const touchMoveHandler = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleMouseMove({
          clientX: e.touches[0].clientX,
          clientY: e.touches[0].clientY,
        } as MouseEvent);
      } else if (e.touches.length === 2) {
        const distance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        handlePinchZoom(distance);
      }
    };

    const touchEndHandler = () => {
      handleMouseUp({} as MouseEvent);
      mouseRef.current.lastPinchDistance = 0;
    };

    const element = canvasRef.current;
    if (element) {
      element.addEventListener('touchstart', touchStartHandler);
      element.addEventListener('touchmove', touchMoveHandler);
      element.addEventListener('touchend', touchEndHandler);
    }

    return () => {
      if (element) {
        element.removeEventListener('touchstart', touchStartHandler);
        element.removeEventListener('touchmove', touchMoveHandler);
        element.removeEventListener('touchend', touchEndHandler);
      }
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handlePinchZoom, mouseRef]);

  // Radial layout around center bubble
  const positionedTopics = topics.map((topic, index) => {
    const total = topics.length;
    const angle = (index / total) * Math.PI * 2;
    const distance = 3 + (topic.size === "lg" ? 1 : topic.size === "md" ? 0.5 : 0);
    
    // Calculate position in 3D space
    const x = Math.cos(angle) * distance;
    const y = (Math.random() - 0.5) * 2; // Slight vertical variation
    const z = Math.sin(angle) * distance;
    
    return {
      ...topic,
      x,
      y,
      z,
      angle,
      distance
    };
  });

  const handleBubbleClick = (e: React.MouseEvent, topicId: string) => {
    e.stopPropagation();
    onBubbleClick(topicId);
  };

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full rounded-xl overflow-hidden"
      onMouseDown={handleMouseDown as any}
      onMouseMove={handleMouseMove as any}
      onMouseUp={handleMouseUp as any}
      onWheel={handleWheel as any}
    >
      <Canvas
        style={{ background: 'transparent' }}
        camera={{ position: [0, 0, 16], fov: 50 }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        
        {/* Earth as the central element */}
        <Earth3D scale={1.5} rotationSpeed={0.001} />
        
        {/* Topic bubbles */}
        {positionedTopics.map((topic) => (
          <mesh
            key={topic.id}
            position={[topic.x, topic.y, topic.z]}
            onClick={(e) => {
              e.stopPropagation();
              onBubbleClick(topic.id);
            }}
          >
            <sphereGeometry args={[topic.size === "lg" ? 0.8 : topic.size === "md" ? 0.6 : 0.4, 32, 32]} />
            <meshPhongMaterial 
              color="#ebbd34" 
              transparent
              opacity={0.8}
              shininess={30}
              emissive="#ebbd34"
              emissiveIntensity={0.2}
            />
          </mesh>
        ))}
        
        <Stars radius={100} depth={50} count={5000} factor={4} fade speed={1} />
      </Canvas>
      
      {/* Display bubble labels */}
      {positionedTopics.map((topic) => {
        const vector = new THREE.Vector3(topic.x, topic.y, topic.z);
        vector.project(new THREE.PerspectiveCamera(50, dimensions.width / dimensions.height, 0.1, 1000));
        
        const x = (vector.x * 0.5 + 0.5) * dimensions.width;
        const y = (-(vector.y * 0.5) + 0.5) * dimensions.height;
        
        // Only show label if bubble is in front of the Earth (z > 0)
        const isVisible = topic.z > 0;
        
        return isVisible && (
          <div
            key={`label-${topic.id}`}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-black/60 px-2 py-1 rounded-full text-white text-xs whitespace-nowrap cursor-pointer"
            style={{
              left: `${x}px`,
              top: `${y}px`,
              opacity: Math.min(1, topic.z * 0.5 + 0.5), // Fade based on z-position
            }}
            onClick={(e) => handleBubbleClick(e, topic.id)}
          >
            {topic.name}
          </div>
        );
      })}
    </div>
  );
};

export default BubbleWorld;
