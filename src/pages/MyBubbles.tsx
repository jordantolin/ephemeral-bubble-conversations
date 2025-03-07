
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import NavigationBar from "@/components/bubbleWorld/NavigationBar";
import BubbleWorldHeader from "@/components/bubbleWorld/BubbleWorldHeader";
import { BubbleData } from "@/types/bubble";
import * as THREE from "three";
import { createBubbleMaterial, createTextCanvas } from "@/utils/bubbleUtils";

const MyBubbles = () => {
  const { user, profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const [isClientSide, setIsClientSide] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const bubbleObjectsRef = useRef<{[key: string]: THREE.Group}>({});
  const animationFrameRef = useRef<number>();
  const navigate = useNavigate();

  // Set isClientSide to true after mount to avoid hydration issues
  useEffect(() => {
    setIsClientSide(true);
  }, []);

  // Fetch user's reflected bubbles and created bubbles
  const { data: myBubbles = [], isLoading: isLoadingBubbles } = useQuery({
    queryKey: ['myBubbles', profile?.username],
    queryFn: async () => {
      if (!user || !profile?.username) {
        console.log("No user or username found, skipping fetch");
        return [];
      }

      try {
        console.log("Fetching bubbles for username:", profile.username);
        
        // Get all bubble IDs that the user has reflected on
        const { data: reflects, error: reflectsError } = await supabase
          .from('reflects')
          .select('bubble_id')
          .eq('username', profile.username);
        
        if (reflectsError) {
          console.error("Error fetching reflects:", reflectsError);
          toast({
            title: "Error fetching reflects",
            description: reflectsError.message,
            variant: "destructive"
          });
          return [];
        }

        console.log("Reflects found:", reflects?.length || 0);

        // Get ALL bubbles created by the user
        const { data: createdBubbles, error: createdBubblesError } = await supabase
          .from('bubbles')
          .select('*')
          .eq('username', profile.username);
        
        if (createdBubblesError) {
          console.error("Error fetching created bubbles:", createdBubblesError);
          toast({
            title: "Error fetching created bubbles",
            description: createdBubblesError.message,
            variant: "destructive"
          });
          return [];
        }
        
        console.log("Created bubbles found:", createdBubbles?.length || 0);

        // If there are reflected bubbles, fetch their details
        const bubbleIds = reflects?.map(r => r.bubble_id) || [];
        let reflectedBubbles = [];
        
        if (bubbleIds.length > 0) {
          const { data: bubbles, error: bubblesError } = await supabase
            .from('bubbles')
            .select('*')
            .in('id', bubbleIds);
          
          if (bubblesError) {
            console.error("Error fetching reflected bubbles:", bubblesError);
            toast({
              title: "Error fetching bubbles",
              description: bubblesError.message,
              variant: "destructive"
            });
          } else {
            reflectedBubbles = bubbles || [];
            console.log("Reflected bubbles fetched:", reflectedBubbles.length);
          }
        }
        
        // Ensure arrays are always defined
        const createdBubblesArray = Array.isArray(createdBubbles) ? createdBubbles : [];
        const reflectedBubblesArray = Array.isArray(reflectedBubbles) ? reflectedBubbles : [];
        
        // Combine both arrays and remove duplicates
        const allBubbles = [...createdBubblesArray];
        
        // Add reflected bubbles if they're not already in the array
        reflectedBubblesArray.forEach(bubble => {
          if (!allBubbles.some(b => b.id === bubble.id)) {
            allBubbles.push(bubble);
          }
        });
        
        console.log("Final combined bubbles count:", allBubbles.length);
        return allBubbles;
      } catch (e) {
        console.error("Unexpected error in myBubbles query:", e);
        toast({
          title: "Error loading bubbles",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive"
        });
        return [];
      }
    },
    enabled: !!user && !!profile?.username && isClientSide,
    refetchInterval: 10000, // Refresh every 10 seconds
    staleTime: 5000,
  });

  // Filter bubbles based on search query
  const filteredBubbles = Array.isArray(myBubbles) 
    ? myBubbles.filter((bubble: BubbleData) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          bubble.name.toLowerCase().includes(searchLower) ||
          bubble.topic.toLowerCase().includes(searchLower) ||
          (bubble.description && bubble.description.toLowerCase().includes(searchLower))
        );
      })
    : [];

  // Initialize 3D scene
  useEffect(() => {
    if (!containerRef.current || !filteredBubbles.length) return;

    // Clean up previous scene
    if (rendererRef.current) {
      if (containerRef.current.contains(rendererRef.current.domElement)) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current.dispose();
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfef7e4);
    sceneRef.current = scene;

    // Create camera
    const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 1000);
    camera.position.z = 10;
    cameraRef.current = camera;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.8);
    backLight.position.set(-1, -1, -1);
    scene.add(backLight);

    // Create bubble objects
    bubbleObjectsRef.current = {};
    
    // Calculate grid layout
    const bubbleCount = filteredBubbles.length;
    const rowCount = Math.ceil(Math.sqrt(bubbleCount));
    const colCount = Math.ceil(bubbleCount / rowCount);
    const spacing = 4;
    
    filteredBubbles.forEach((bubble, index) => {
      const group = new THREE.Group();
      
      // Calculate position in grid
      const col = index % colCount;
      const row = Math.floor(index / colCount);
      
      // Position with some offset to create a grid
      const xPos = (col - (colCount - 1) / 2) * spacing;
      const yPos = (row - (rowCount - 1) / 2) * spacing;
      
      // Add randomness to position for more natural look
      const randX = (Math.random() - 0.5) * 0.5;
      const randY = (Math.random() - 0.5) * 0.5;
      
      group.position.set(xPos + randX, yPos + randY, 0);
      
      // Create bubble geometry and material
      const size = 1.5;
      const geometry = new THREE.SphereGeometry(size, 32, 32);
      const material = createBubbleMaterial();
      
      const mesh = new THREE.Mesh(geometry, material);
      group.add(mesh);
      
      // Add bubble name
      const createLabelSprite = (text, yOffset, fontSize) => {
        const canvas = createTextCanvas(text, fontSize);
        const texture = new THREE.CanvasTexture(canvas);
        
        const spriteMaterial = new THREE.SpriteMaterial({
          map: texture,
          transparent: true
        });
        
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(size * 2.5, size * 1.25, 1);
        sprite.position.set(0, yOffset, 0);
        return sprite;
      };
      
      // Add name, topic and reflect count labels
      group.add(createLabelSprite(bubble.name, 0, 28));
      group.add(createLabelSprite(bubble.topic, -size * 0.8, 20));
      group.add(createLabelSprite(`⭐ ${bubble.reflect_count}`, -size * 1.5, 18));
      
      group.userData = { id: bubble.id };
      scene.add(group);
      bubbleObjectsRef.current[bubble.id] = group;
    });

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      
      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Handle click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event) => {
      if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      raycaster.setFromCamera(mouse, cameraRef.current);
      
      const intersects = raycaster.intersectObjects(sceneRef.current.children, true);
      
      if (intersects.length > 0) {
        let object = intersects[0].object;
        let parent = object.parent;
        
        // Navigate up to find the group with the id
        while (parent && (!parent.userData || !parent.userData.id)) {
          parent = parent.parent;
        }
        
        if (parent && parent.userData && parent.userData.id) {
          navigate(`/bubble/${parent.userData.id}`);
        }
      }
    };

    container.addEventListener('click', handleClick);

    // Animation loop
    let time = 0;
    const animate = () => {
      time += 0.005;
      
      // Gentle floating animation for all bubbles
      Object.values(bubbleObjectsRef.current).forEach((group, index) => {
        // Each bubble has a slightly different animation phase
        const phase = index * 0.2;
        
        // Gentle up and down motion
        group.position.y += Math.sin(time + phase) * 0.0025;
        
        // Subtle rotation
        group.rotation.y = Math.sin(time * 0.5 + phase) * 0.1;
        
        // Very gentle left-right motion
        group.position.x += Math.sin(time * 0.3 + phase) * 0.001;
      });
      
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('click', handleClick);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (rendererRef.current) {
        if (containerRef.current?.contains(rendererRef.current.domElement)) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current.dispose();
      }
      
      // Clean up geometries and materials
      Object.values(bubbleObjectsRef.current).forEach(group => {
        group.children.forEach(child => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      });
    };
  }, [filteredBubbles, navigate]);
  
  return (
    <div className="min-h-screen bg-[#FEF7E4]">
      {/* Navigation */}
      <NavigationBar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      
      <div className="pt-28 pb-16 px-4 sm:px-6 relative z-10">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <BubbleWorldHeader 
            onCreateBubble={() => {}} 
            showDescription={false}
            showCreateButton={false}
            title="My Bubbles Universe"
          />
        
          <div className="md:flex justify-between items-center mb-6 mt-8">
            <div></div> {/* Empty div to maintain layout */}
            <Link to="/">
              <div className="border-[#ebbd34]/20 text-[#ebbd34] hover:bg-[#ebbd34]/5 w-full md:w-auto p-2 px-4 rounded-md border text-center">
                Explore More Bubbles
              </div>
            </Link>
          </div>

          {/* Mobile Search Bar */}
          <div className="mb-6 md:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#ebbd34]/70" />
              <input
                type="search"
                placeholder="Search your bubbles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-full border-none bg-[#ebbd34]/5 text-[#ebbd34] placeholder:text-[#ebbd34]/50 focus:ring-2 focus:ring-[#ebbd34]/20 focus:outline-none text-sm"
              />
            </div>
          </div>

          {isLoadingBubbles ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-[#ebbd34] animate-spin mb-4" />
              <p className="text-[#ebbd34]">Loading your bubbles...</p>
            </div>
          ) : !Array.isArray(myBubbles) || myBubbles.length === 0 || filteredBubbles.length === 0 ? (
            <div className="text-center py-16 bg-white/60 rounded-3xl shadow-sm backdrop-blur-sm">
              {searchQuery ? (
                <>
                  <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-[#ebbd34]/10">
                    <Search className="w-8 h-8 text-[#ebbd34]" />
                  </div>
                  <h3 className="text-lg font-medium text-[#ebbd34]">No matches found</h3>
                  <p className="text-gray-500 mt-2">Try a different search term</p>
                </>
              ) : (
                <>
                  <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-[#ebbd34]/10">
                    <div className="w-8 h-8 text-[#ebbd34]">🔍</div>
                  </div>
                  <h3 className="text-lg font-medium text-[#ebbd34]">No bubbles yet</h3>
                  <p className="text-gray-500 mt-2">Create a new bubble or reflect on existing ones!</p>
                  <Link to="/">
                    <div className="mt-4 bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white px-4 py-2 rounded-md inline-block">
                      Explore Bubbles
                    </div>
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div 
              ref={containerRef} 
              className="w-full bg-[#FEF7E4]/70 rounded-3xl shadow-lg overflow-hidden"
              style={{ height: '60vh', minHeight: '500px' }}
            >
              {/* 3D bubbles will be rendered here */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyBubbles;
