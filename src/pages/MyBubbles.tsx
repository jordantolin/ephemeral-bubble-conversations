import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BubbleData } from "@/types/bubble";
import { Search, User, TrendingUp, Sparkles } from "lucide-react";
import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const MyBubbles = () => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const bubblesRef = useRef<{ [key: string]: THREE.Group }>({});
  const animationFrameRef = useRef<number>();
  const [selectedBubble, setSelectedBubble] = useState<BubbleData | null>(null);
  
  const { data: bubbles = [] } = useQuery({
    queryKey: ['bubbles', 'my-all'],
    queryFn: async () => {
      // Get all bubbles created in the last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentBubbles, error: recentError } = await supabase
        .from('bubbles')
        .select('*')
        .gte('created_at', yesterday)
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
    
    // Use a smaller radius to ensure bubbles stay inside the visible container
    const radius = Math.min(width, height) / 3;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 15;  // Moved closer to make scene more visible
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true
    });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Enhanced lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(10, 10, 10);
    scene.add(mainLight);

    // Create the container circle with solid fill
    const circleGeometry = new THREE.CircleGeometry(radius, 64);
    const circleMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xebbd34,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    const circle = new THREE.Mesh(circleGeometry, circleMaterial);
    scene.add(circle);

    // Add visible border ring
    const ringGeometry = new THREE.RingGeometry(radius - 0.1, radius, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xebbd34,
      opacity: 0.8,
      transparent: true,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    scene.add(ring);

    // Create and position bubbles
    bubbles.forEach((bubble) => {
      const group = new THREE.Group();
      const size = bubble.size === 'lg' ? 0.6 : 
                   bubble.size === 'md' ? 0.4 : 0.3;
      const scaledSize = size * (1 + bubble.reflect_count * 0.1);
      
      // Create bubble sphere
      const geometry = new THREE.SphereGeometry(scaledSize, 32, 32);
      const material = new THREE.MeshPhysicalMaterial({
        color: 0xebbd34,
        transparent: true,
        opacity: 0.7,
        metalness: 0.1,
        roughness: 0.2,
        transmission: 0.3,
        clearcoat: 1.0,
      });
      
      const bubble3D = new THREE.Mesh(geometry, material);
      group.add(bubble3D);

      // Add text sprites
      const createSprite = (text: string, yOffset: number) => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const context = canvas.getContext('2d')!;
        
        context.fillStyle = 'transparent';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.font = 'bold 24px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        context.strokeStyle = '#000000';
        context.lineWidth = 4;
        context.strokeText(text, canvas.width/2, canvas.height/2);
        
        context.fillStyle = '#FFFFFF';
        context.fillText(text, canvas.width/2, canvas.height/2);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(2 * scaledSize, 1 * scaledSize, 1);
        sprite.position.y = yOffset * scaledSize;
        return sprite;
      };

      group.add(createSprite(bubble.name, 1.5));
      group.add(createSprite(`✨ ${bubble.reflect_count}`, -1.5));

      // Place bubbles randomly within 60% of the circle radius
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius * 0.6;
      group.position.x = Math.cos(angle) * distance;
      group.position.y = Math.sin(angle) * distance;
      
      // Initial velocity
      const speed = 0.015;
      const randomAngle = Math.random() * Math.PI * 2;
      group.userData = {
        vx: Math.cos(randomAngle) * speed,
        vy: Math.sin(randomAngle) * speed,
        id: bubble.id
      };

      bubblesRef.current[bubble.id] = group;
      scene.add(group);
    });

    // Animation loop with strict boundary checking
    const animate = () => {
      Object.values(bubblesRef.current).forEach(group => {
        // Update position
        group.position.x += group.userData.vx;
        group.position.y += group.userData.vy;

        // Circle boundary collision with strict containment
        const distance = Math.sqrt(
          group.position.x * group.position.x + 
          group.position.y * group.position.y
        );
        
        const maxRadius = radius * 0.7; // Keep within 70% of circle radius
        if (distance > maxRadius) {
          // Push back inside the circle
          const angle = Math.atan2(group.position.y, group.position.x);
          group.position.x = maxRadius * Math.cos(angle);
          group.position.y = maxRadius * Math.sin(angle);
          
          // Bounce with increased damping
          const normal = new THREE.Vector2(
            group.position.x / distance,
            group.position.y / distance
          );
          const dot = normal.x * group.userData.vx + normal.y * group.userData.vy;
          group.userData.vx = (group.userData.vx - 2 * dot * normal.x) * 0.7;
          group.userData.vy = (group.userData.vy - 2 * dot * normal.y) * 0.7;
        }

        // Bubble collisions
        Object.values(bubblesRef.current).forEach(otherGroup => {
          if (group === otherGroup) return;

          const dx = otherGroup.position.x - group.position.x;
          const dy = otherGroup.position.y - group.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          const minDistance = 1.5;
          if (distance < minDistance) {
            const angle = Math.atan2(dy, dx);
            const pushX = Math.cos(angle) * (minDistance - distance) * 0.5;
            const pushY = Math.sin(angle) * (minDistance - distance) * 0.5;
            
            group.position.x -= pushX;
            group.position.y -= pushY;
            otherGroup.position.x += pushX;
            otherGroup.position.y += pushY;
            
            // Exchange velocities with damping
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

        // Gentle floating effect
        group.userData.vy += Math.sin(Date.now() / 2000) * 0.00005;
        group.userData.vx += Math.cos(Date.now() / 2000) * 0.00005;

        // Velocity damping
        group.userData.vx *= 0.995;
        group.userData.vy *= 0.995;
      });

      renderer.render(scene, camera);
      TWEEN.update();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Click handling
    const onClick = (event: MouseEvent) => {
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
            setSelectedBubble(bubble);
          }
        }
      }
    };

    container.addEventListener('click', onClick);
    animate();

    return () => {
      container.removeEventListener('click', onClick);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (renderer) {
        renderer.dispose();
        container.removeChild(renderer.domElement);
      }
    };
  }, [bubbles]);

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
      
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-light text-primary mb-2">
            Recent Bubbles
          </h1>
          <p className="text-primary/60">
            All bubbles created in the last 24 hours
          </p>
          <div className="h-px w-24 bg-primary/20 mx-auto mt-4" />
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
                {!selectedBubble?.expires_at || new Date(selectedBubble.expires_at) > new Date() 
                  ? selectedBubble?.description || "This bubble is still active"
                  : "This bubble has already exploded"}
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default MyBubbles;
