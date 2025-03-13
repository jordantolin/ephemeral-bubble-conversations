
import React, { useState } from 'react';
import BubbleWorld3D from '@/components/earth/BubbleWorld3D';
import NavigationBar from '@/components/bubbleWorld/NavigationBar';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

const BubbleEarth: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    showClouds: true,
    showAtmosphere: true,
    rotationSpeed: 0.5, // Scale of 0-1 for UI, will be converted
    qualityLevel: 'high'
  });

  // Handle settings changes
  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-secondary/20 overflow-hidden relative">
      <NavigationBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      
      <div className="pt-24 md:pt-28 pb-20 md:pb-16 px-4 sm:px-6 relative z-10">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-primary">Bubble Earth</h1>
            <p className="text-gray-600 mt-2">Explore conversations around the globe</p>
          </div>
          
          {/* 3D Earth component */}
          <div className="bg-black/5 backdrop-blur-sm rounded-xl shadow-lg p-4 md:p-6 h-[500px] relative">
            <BubbleWorld3D />
            
            {/* Settings toggle */}
            <button
              className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded text-sm font-medium text-gray-800 hover:bg-white/90 transition-colors z-20"
              onClick={() => setShowSettings(!showSettings)}
            >
              {showSettings ? 'Hide Settings' : 'Earth Settings'}
            </button>
            
            {/* Settings panel */}
            {showSettings && (
              <Card className="absolute top-14 left-4 w-64 bg-white/90 backdrop-blur-sm shadow-lg z-20 overflow-hidden border-0">
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showClouds" className="text-sm font-medium">Cloud Layer</Label>
                      <Switch 
                        id="showClouds" 
                        checked={settings.showClouds}
                        onCheckedChange={(checked) => handleSettingChange('showClouds', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showAtmosphere" className="text-sm font-medium">Atmosphere</Label>
                      <Switch 
                        id="showAtmosphere" 
                        checked={settings.showAtmosphere}
                        onCheckedChange={(checked) => handleSettingChange('showAtmosphere', checked)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="rotationSpeed" className="text-sm font-medium">Rotation Speed</Label>
                    <Slider 
                      id="rotationSpeed"
                      min={0}
                      max={1}
                      step={0.01}
                      value={[settings.rotationSpeed]}
                      onValueChange={(value) => handleSettingChange('rotationSpeed', value[0])}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Quality Level</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {['low', 'medium', 'high'].map(level => (
                        <button
                          key={level}
                          className={`px-2 py-1 text-xs rounded-md ${
                            settings.qualityLevel === level 
                              ? 'bg-primary text-white' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          onClick={() => handleSettingChange('qualityLevel', level)}
                        >
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Drag to rotate • Scroll to zoom • Double-click to reset view</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BubbleEarth;
