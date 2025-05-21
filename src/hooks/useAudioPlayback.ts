
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

export const useAudioPlayback = () => {
  const { toast } = useToast();
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  // Audio playback
  const togglePlayAudio = (messageId: string, audioSrc: string) => {
    console.log("Toggle audio playback for message:", messageId);
    
    try {
      if (!audioRefs.current[messageId]) {
        const audio = new Audio();
        audio.preload = 'auto';
        
        audio.addEventListener('error', (e) => {
          console.error('Audio playback error:', e);
          setPlayingAudioId(null);
          toast({
            title: "Playback Error",
            description: "Unable to play this audio message",
            variant: "destructive"
          });
        });
        
        audio.addEventListener('ended', () => {
          console.log("Audio playback ended");
          setPlayingAudioId(null);
        });
        
        audioRefs.current[messageId] = audio;
      }
      
      const audio = audioRefs.current[messageId];

      if (playingAudioId === messageId) {
        audio.pause();
        setPlayingAudioId(null);
      } else {
        if (playingAudioId && audioRefs.current[playingAudioId]) {
          audioRefs.current[playingAudioId].pause();
        }
        
        audio.src = audioSrc;
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log("Audio playing successfully");
              setPlayingAudioId(messageId);
            })
            .catch(err => {
              console.error("Play error:", err);
              
              if (err.name === 'NotAllowedError') {
                toast({
                  title: "Playback Error",
                  description: "Click anywhere on the screen first, then try playing the audio again",
                });
                
                const unlockAudio = () => {
                  document.removeEventListener('click', unlockAudio);
                  document.removeEventListener('touchstart', unlockAudio);
                  
                  audio.play()
                    .then(() => {
                      console.log("Audio unlocked and playing");
                      setPlayingAudioId(messageId);
                    })
                    .catch(e => console.error("Still can't play audio:", e));
                };
                
                document.addEventListener('click', unlockAudio, { once: true });
                document.addEventListener('touchstart', unlockAudio, { once: true });
              }
            });
        }
      }
    } catch (error) {
      console.error("Audio toggle error:", error);
      toast({
        title: "Audio Error",
        description: "There was a problem playing this audio message",
        variant: "destructive"
      });
    }
  };

  // Clean up audio resources
  const cleanupAudio = () => {
    Object.values(audioRefs.current).forEach(audio => {
      audio.pause();
      audio.src = '';
    });
  };

  return {
    playingAudioId,
    togglePlayAudio,
    cleanupAudio
  };
};
