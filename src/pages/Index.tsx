
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import BubbleWorld from '@/components/BubbleWorld';
import InstallButton from '@/components/InstallButton';
import { BubbleData } from '@/types/bubble';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const { toast } = useToast();
  
  // Sample bubble data for demonstration
  const [demoTopics, setDemoTopics] = useState<BubbleData[]>([
    {
      id: "demo-1",
      topic: "Travel in Italy",
      username: "travel_lover",
      name: "Summer Destinations",
      size: "lg",
      reflect_count: 15,
      expires_at: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "demo-2",
      topic: "Regional Recipes",
      username: "chef_mario",
      name: "Traditional Cuisine",
      size: "md",
      reflect_count: 8,
      expires_at: new Date(Date.now() + 15 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "demo-3",
      topic: "Italian Cinema",
      username: "film_buff",
      name: "Classic Movies",
      size: "sm",
      reflect_count: 5,
      expires_at: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString()
    }
  ]);

  // Handler for bubble clicks
  const handleBubbleClick = (id: string) => {
    if (user) {
      navigate(`/bubbles/${id}`);
    } else {
      toast({
        title: "Login Required",
        description: "Please log in to interact with bubbles",
        variant: "default"
      });
      navigate('/auth/login');
    }
  };

  useEffect(() => {
    // Check if this is a standalone PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    
    // Only show install prompt if not already in standalone mode
    setShowInstallPrompt(!isStandalone);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC]">
      {/* Header */}
      <header className="p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img 
            src="/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png"
            alt="Bubble Trouble"
            className="w-10 h-10"
          />
          <h1 className="text-xl font-bold text-[#ebbd34]">Bubble Trouble</h1>
        </div>
        <div className="flex items-center gap-3">
          {showInstallPrompt && <InstallButton />}
          {user ? (
            <Button 
              onClick={() => navigate('/my-bubbles')}
              className="bg-[#ebbd34] text-white hover:bg-[#ebbd34]/90"
            >
              My Bubbles
            </Button>
          ) : (
            <Button 
              onClick={() => navigate('/auth/login')}
              className="bg-[#ebbd34] text-white hover:bg-[#ebbd34]/90"
            >
              Login
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-3xl w-full text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-[#ebbd34] mb-4">
            Ephemeral chats that last only 24 hours
          </h2>
          <p className="text-base md:text-lg text-gray-600 mb-8">
            Create or join conversation bubbles that will burst after 24 hours.
            Each conversation is a unique moment to share.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Button 
                onClick={() => navigate('/feed')}
                className="bg-[#ebbd34] text-white hover:bg-[#ebbd34]/90 px-8 py-4 md:py-6 text-lg w-full sm:w-auto"
              >
                Explore Bubbles
              </Button>
            ) : (
              <Button 
                onClick={() => navigate('/auth/register')}
                className="bg-[#ebbd34] text-white hover:bg-[#ebbd34]/90 px-8 py-4 md:py-6 text-lg w-full sm:w-auto"
              >
                Start Now
              </Button>
            )}
          </div>
        </div>
        
        <div className="w-full h-[50vh] relative">
          <BubbleWorld topics={demoTopics} onBubbleClick={handleBubbleClick} />
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-gray-500 text-sm">
        <p>© 2023 Bubble Trouble. All bubbles burst after 24 hours.</p>
      </footer>
    </div>
  );
};

export default Index;
