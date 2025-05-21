
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export const useAudioRecording = (onRecordingComplete: (audioDataUrl: string) => Promise<void>) => {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Format recording time
  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVoiceRecord = () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    audioChunksRef.current = [];

    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    };

    navigator.mediaDevices.getUserMedia(constraints)
      .then(stream => {
        const mimeTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4;codecs=opus',
          'audio/mp4',
          'audio/ogg;codecs=opus',
          'audio/ogg'
        ];

        let options = {};
        for (const type of mimeTypes) {
          try {
            if (MediaRecorder.isTypeSupported(type)) {
              options = { 
                mimeType: type,
                audioBitsPerSecond: 128000
              };
              console.log("Using MIME type:", type);
              break;
            }
          } catch (e) {
            console.log("MIME type not supported:", type);
          }
        }

        try {
          mediaRecorderRef.current = new MediaRecorder(stream, options);
        } catch (e) {
          console.error("MediaRecorder error:", e);
          mediaRecorderRef.current = new MediaRecorder(stream);
        }
        
        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorderRef.current.onstop = async () => {
          try {
            const audioBlob = new Blob(audioChunksRef.current, { 
              type: mediaRecorderRef.current?.mimeType || 'audio/webm' 
            });
            
            console.log("Audio blob created:", audioBlob.size, "bytes, type:", audioBlob.type);
            
            const reader = new FileReader();
            reader.onload = async (e) => {
              const content = e.target?.result as string;
              console.log("Audio data URL created, length:", content.length);
              
              await onRecordingComplete(content);
            };
            
            reader.onerror = (err) => {
              console.error("FileReader error:", err);
              toast({
                title: "Error processing audio",
                description: "Could not create audio message",
                variant: "destructive"
              });
            };
            
            reader.readAsDataURL(audioBlob);
          } catch (error) {
            console.error("Audio processing error:", error);
          } finally {
            stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            setRecordingSeconds(0);
            if (recordingTimerRef.current) {
              window.clearInterval(recordingTimerRef.current);
              recordingTimerRef.current = null;
            }
          }
        };

        mediaRecorderRef.current.start(100);
        setIsRecording(true);
        
        recordingTimerRef.current = window.setInterval(() => {
          setRecordingSeconds(prev => prev + 1);
        }, 1000);
        
        setTimeout(() => {
          if (mediaRecorderRef.current?.state === 'recording') {
            stopRecording();
          }
        }, 60000);
      })
      .catch(error => {
        console.error("Media device error:", error);
        toast({
          title: "Microphone Error",
          description: "Could not access your microphone. Please check your browser permissions.",
          variant: "destructive"
        });
      });
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (error) {
        console.error("Error stopping recording:", error);
      }
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return {
    isRecording,
    recordingSeconds,
    formatRecordingTime,
    handleVoiceRecord,
    stopRecording
  };
};
