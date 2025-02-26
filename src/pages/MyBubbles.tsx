import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BubbleData } from "@/types/bubble";
import { Search, User, TrendingUp, Sparkles } from "lucide-react";
import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import {
  createBubbleGeometry,
  createBubbleMaterial,
  createTextCanvas,
  createContainerCircleGeometry,
  createContainerCircleMaterial,
  createContainerRingGeometry,
  createContainerRingMaterial
} from "@/utils/bubbleUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const MyBubbles = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const bubblesRef = useRef<{ [key: string]: THREE.Group }>({});
  const animationFrameRef = useRef<number>();
  const [selectedBubble, setSelectedBubble] = useState<BubbleData | null>(null);
  
  const { data: bubbles = [] } = useQuery({
    queryKey: ['bubbles', 'my-72h'],
    queryFn: async () => {
      // Get bubbles created in the last 72 hours
      const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
      const { data: recentBubbles, error: recentError } = await supabase
        .from('bubbles')
        .select('*')
        .gte('created_at', threeDaysAgo)
        .order('created_at', { ascending: false });
      
      if (recentError) throw recentError;

      return recentBubbles.map(bubble => ({
        ...bubble,
        size: bubble.size as "sm" | "md" | "lg"
      })) as BubbleData[];
    }
  });

  useEffect(() => {
    if (!containerRef.current || !bubbles.length) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Adjusted radius for better visibility
    const radius = Math.min(width, height) * 0.35;
    
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Updated camera position and settings for front horizontal view
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 0, 15); // Move camera closer and directly in front
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true
    });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Improved lighting for better visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 2);
    scene.add(ambientLight);

    const frontLight = new THREE.DirectionalLight(0xffffff, 2);
    frontLight.position.set(0, 0, 10);
    scene.add(frontLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 1);
    topLight.position.set(0, 10, 0);
    scene.add(topLight);

    // Create container circle facing the camera
    const circleGeometry = createContainerCircleGeometry(radius);
    const circleMaterial = createContainerCircleMaterial();
    const circle = new THREE.Mesh(circleGeometry, circleMaterial);
    scene.add(circle);

    // Create visible border ring
    const ringGeometry = createContainerRingGeometry(radius);
    const ringMaterial = createContainerRingMaterial();
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    scene.add(ring);

    // Distribute bubbles in a circular pattern
    bubbles.forEach((bubble, index) => {
      const group = new THREE.Group();
      const size = bubble.size === 'lg' ? 0.8 : 
                   bubble.size === 'md' ? 0.6 : 0.4;
      const scaledSize = size * (1 + bubble.reflect_count * 0.1);
      
      const geometry = createBubbleGeometry(scaledSize);
      const material = createBubbleMaterial();
      const bubble3D = new THREE.Mesh(geometry, material);
      group.add(bubble3D);

      // Improved text visibility
      const nameTexture = new THREE.CanvasTexture(createTextCanvas(bubble.name, 32));
      const nameSprite = new THREE.Sprite(new THREE.SpriteMaterial({ 
        map: nameTexture,
        transparent: true,
        opacity: 0.9
      }));
      nameSprite.scale.set(2 * scaledSize, 1 * scaledSize, 1);
      nameSprite.position.y = 1.2 * scaledSize;
      group.add(nameSprite);

      const countTexture = new THREE.CanvasTexture(createTextCanvas(`✨ ${bubble.reflect_count}`, 28));
      const countSprite = new THREE.Sprite(new THREE.SpriteMaterial({ 
        map: countTexture,
        transparent: true,
        opacity: 0.9
      }));
      countSprite.scale.set(2 * scaledSize, 1 * scaledSize, 1);
      countSprite.position.y = -1.2 * scaledSize;
      group.add(countSprite);

      // Position bubbles in a circle with slight randomization
      const angleStep = (2 * Math.PI) / bubbles.length;
      const angle = angleStep * index;
      const distance = radius * (0.4 + Math.random() * 0.2); // Between 40% and 60% of radius
      group.position.x = Math.cos(angle) * distance;
      group.position.y = Math.sin(angle) * distance; // Use Y instead of Z for horizontal view
      
      // Initial velocities for horizontal movement
      const speed = 0.02 + Math.random() * 0.01;
      const velocityAngle = Math.random() * Math.PI * 2;
      group.userData = {
        vx: Math.cos(velocityAngle) * speed,
        vy: Math.sin(velocityAngle) * speed, // Use vy for horizontal plane
        id: bubble.id
      };

      bubblesRef.current[bubble.id] = group;
      scene.add(group);
    });

    // Updated animation loop for horizontal movement
    const animate = () => {
      Object.values(bubblesRef.current).forEach(group => {
        // Update position
        group.position.x += group.userData.vx;
        group.position.y += group.userData.vy;

        // Circle boundary collision
        const distance = Math.sqrt(
          group.position.x * group.position.x + 
          group.position.y * group.position.y
        );
        
        const maxRadius = radius * 0.65; // Keep bubbles contained
        if (distance > maxRadius) {
          const angle = Math.atan2(group.position.y, group.position.x);
          group.position.x = maxRadius * Math.cos(angle);
          group.position.y = maxRadius * Math.sin(angle);
          
          // Bounce physics
          const normal = new THREE.Vector2(
            group.position.x / distance,
            group.position.y / distance
          );
          const dot = normal.x * group.userData.vx + normal.y * group.userData.vy;
          group.userData.vx = (group.userData.vx - 2 * dot * normal.x) * 0.95;
          group.userData.vy = (group.userData.vy - 2 * dot * normal.y) * 0.95;
        }

        // Bubble collisions
        Object.values(bubblesRef.current).forEach(otherGroup => {
          if (group === otherGroup) return;

          const dx = otherGroup.position.x - group.position.x;
          const dy = otherGroup.position.y - group.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          const minDistance = 2;
          if (distance < minDistance) {
            const angle = Math.atan2(dy, dx);
            const pushX = Math.cos(angle) * (minDistance - distance) * 0.5;
            const pushY = Math.sin(angle) * (minDistance - distance) * 0.5;
            
            group.position.x -= pushX;
            group.position.y -= pushY;
            otherGroup.position.x += pushX;
            otherGroup.position.y += pushY;
            
            // Velocity exchange
            const tempVx = group.userData.vx;
            const tempVy = group.userData.vy;
            group.userData.vx = otherGroup.userData.vx * 0.95;
            group.userData.vy = otherGroup.userData.vy * 0.95;
            otherGroup.userData.vx = tempVx * 0.95;
            otherGroup.userData.vy = tempVy * 0.95;
          }
        });

        // Keep text facing camera
        group.quaternion.copy(camera.quaternion);
      });

      renderer.render(scene, camera);
      TWEEN.update();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Handle bubble clicks
    const handleClick = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / width) * 2 - 1,
        -((event.clientY - rect.top) / height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj.parent && !(obj.userData?.id)) {
          obj = obj.parent;
        }
        
        if (obj.userData?.id) {
          const bubble = bubbles.find(b => b.id === obj.userData.id);
          if (bubble) {
            if (bubble.expires_at && new Date(bubble.expires_at) <= new Date()) {
              setSelectedBubble(bubble);
            } else {
              navigate(`/chat/${bubble.id}`);
            }
          }
        }
      }
    };

    container.addEventListener('click', handleClick);
    animate();

    return () => {
      container.removeEventListener('click', handleClick);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (renderer) {
        renderer.dispose();
        container.removeChild(renderer.domElement);
      }
    };
  }, [bubbles, navigate]);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC]">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#ebbd34]/10">
        <div className="container mx-auto">
          <div className="flex items-center justify-between h-16 px-4">
            {/* Logo and Search Section */}
            <div className="flex items-center gap-6 flex-1">
              <Link to="/" className="flex items-center gap-2 shrink-0">
                <img 
                  src="/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png"
                  alt="Bubble Trouble"
                  className="w-8 h-8"
                />
                <span className="text-xl font-semibold text-[#ebbd34] hidden sm:inline">
                  Bubble Trouble
                </span>
              </Link>
              
              <div className="relative flex-1 max-w-md hidden sm:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#ebbd34]/70 w-4 h-4" />
                <input
                  type="search"
                  placeholder="Search bubbles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-full bg-[#ebbd34]/5 border-none text-[#ebbd34] placeholder-[#ebbd34]/50 focus:ring-2 focus:ring-[#ebbd34]/20 focus:outline-none"
                />
              </div>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center gap-1">
              <Link 
                to="/my-bubbles" 
                className={`nav-link flex items-center gap-2 px-4 py-2 rounded-full text-[#ebbd34] hover:bg-[#ebbd34]/5 transition-colors ${
                  location.pathname === '/my-bubbles' ? 'bg-[#ebbd34]/10' : ''
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">My Bubbles</span>
              </Link>
              <Link 
                to="/feed" 
                className={`nav-link flex items-center gap-2 px-4 py-2 rounded-full text-[#ebbd34] hover:bg-[#ebbd34]/5 transition-colors ${
                  location.pathname === '/feed' ? 'bg-[#ebbd34]/10' : ''
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Feed</span>
              </Link>
              <Link 
                to="/profile" 
                className="p-2 hover:bg-[#ebbd34]/5 rounded-full text-[#ebbd34] transition-colors"
              >
                <User className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="sm:hidden px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#ebbd34]/70 w-4 h-4" />
            <input
              type="search"
              placeholder="Search bubbles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full bg-[#ebbd34]/5 border-none text-[#ebbd34] placeholder-[#ebbd34]/50 focus:ring-2 focus:ring-[#ebbd34]/20 focus:outline-none"
            />
          </div>
        </div>
      </nav>
      
      <main className="container mx-auto px-4 py-8 mt-16">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-light text-[#ebbd34] mb-2">
            Recent Bubbles
          </h1>
          <p className="text-[#ebbd34]/60">
            All bubbles created in the last 72 hours
          </p>
          <div className="h-px w-24 bg-[#ebbd34]/20 mx-auto mt-4" />
        </div>

        <div 
          ref={containerRef}
          style={{ 
            position: 'relative',
            width: '600px',
            height: '600px',
            margin: '0 auto',
            zIndex: 10
          }}
        />

        <Dialog open={!!selectedBubble} onOpenChange={() => setSelectedBubble(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedBubble?.name}</DialogTitle>
              <DialogDescription>
                {selectedBubble?.expires_at && new Date(selectedBubble.expires_at) <= new Date() 
                  ? "This bubble has already exploded"
                  : selectedBubble?.description || "This bubble is still active"}
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default MyBubbles;
