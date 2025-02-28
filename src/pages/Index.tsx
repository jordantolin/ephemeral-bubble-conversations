
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import BubbleWorld from '@/components/BubbleWorld';
import InstallButton from '@/components/InstallButton';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

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
              Le mie bolle
            </Button>
          ) : (
            <Button 
              onClick={() => navigate('/auth/login')}
              className="bg-[#ebbd34] text-white hover:bg-[#ebbd34]/90"
            >
              Accedi
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-3xl w-full text-center mb-8">
          <h2 className="text-4xl font-bold text-[#ebbd34] mb-4">
            Chat effimere che durano solo 24 ore
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Crea o unisciti a bolle di conversazione che esploderanno dopo 24 ore.
            Ogni conversazione è un momento unico da condividere.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Button 
                onClick={() => navigate('/feed')}
                className="bg-[#ebbd34] text-white hover:bg-[#ebbd34]/90 px-8 py-6 text-lg"
              >
                Esplora le bolle
              </Button>
            ) : (
              <Button 
                onClick={() => navigate('/auth/register')}
                className="bg-[#ebbd34] text-white hover:bg-[#ebbd34]/90 px-8 py-6 text-lg"
              >
                Inizia ora
              </Button>
            )}
          </div>
        </div>
        
        <div className="w-full h-[50vh] relative">
          <BubbleWorld />
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-gray-500 text-sm">
        <p>© 2023 Bubble Trouble. Tutte le bolle esplodono dopo 24 ore.</p>
      </footer>
    </div>
  );
};

export default Index;
