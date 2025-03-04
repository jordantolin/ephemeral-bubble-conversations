
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createCentralWorldGeometry, createCentralWorldMaterial } from '@/utils/bubbleUtils';
import { InteractionState } from './types';

interface BubbleDisplayProps {
  container: HTMLDivElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  interactionRef: React.MutableRefObject<InteractionState>;
  isMobile: boolean;
}

const BubbleDisplay = ({ 
  container, 
  scene, 
  camera, 
  interactionRef, 
  isMobile 
}: BubbleDisplayProps) => {
  const centralWorldRef = useRef<THREE.Mesh | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Set up the renderer and central world
  console.log("BubbleDisplay initializing with container: ", container ? "exists" : "missing");
  
  // Set up the main renderer
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
    alpha: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  
  container.appendChild(renderer.domElement);
  rendererRef.current = renderer;

  // Set up the background scene
  scene.background = new THREE.Color('#F9F7F0');
  scene.fog = new THREE.FogExp2('#F9F7F0', 0.03);

  // Set up lighting
  setupLighting(scene);

  // Create central world
  const worldGeometry = createCentralWorldGeometry();
  const worldMaterial = createCentralWorldMaterial();
  const centralWorld = new THREE.Mesh(worldGeometry, worldMaterial);
  centralWorld.castShadow = true;
  centralWorld.receiveShadow = true;
  centralWorld.scale.set(1.2, 1.2, 1.2);
  centralWorldRef.current = centralWorld;
  scene.add(centralWorld);

  // Set up resize handling
  const handleResize = () => {
    if (!container || !camera || !renderer) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
  };

  window.addEventListener('resize', handleResize);

  useEffect(() => {
    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (container?.contains(rendererRef.current.domElement)) {
          container.removeChild(rendererRef.current.domElement);
        }
      }
      
      window.removeEventListener('resize', handleResize);
      
      // Cleanup central world
      if (centralWorldRef.current) {
        if (centralWorldRef.current.geometry) {
          centralWorldRef.current.geometry.dispose();
        }
        if (centralWorldRef.current.material) {
          const material = Array.isArray(centralWorldRef.current.material) 
            ? centralWorldRef.current.material 
            : [centralWorldRef.current.material];
          material.forEach(m => m.dispose());
        }
        scene.remove(centralWorldRef.current);
      }
    };
  }, [container, scene, camera]);

  return { renderer: rendererRef.current, centralWorld: centralWorldRef.current };
};

// Helper function to set up scene lighting
function setupLighting(scene: THREE.Scene) {
  const ambientLight = new THREE.AmbientLight('#FFFFFF', 1.5);
  scene.add(ambientLight);

  const hemisphereLight = new THREE.HemisphereLight('#FFFFFF', '#F5E1C0', 1.5);
  scene.add(hemisphereLight);

  const mainLight = new THREE.DirectionalLight('#FFFFFF', 2.2);
  mainLight.position.set(5, 7, 8);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 1024;
  mainLight.shadow.mapSize.height = 1024;
  scene.add(mainLight);

  const secondaryLight = new THREE.DirectionalLight('#FFF5E0', 1.2);
  secondaryLight.position.set(-7, -5, -8);
  scene.add(secondaryLight);

  const centerLight = new THREE.PointLight('#FBE8A6', 1.5, 10);
  centerLight.position.set(0, 0, 0);
  scene.add(centerLight);
}

export default BubbleDisplay;
