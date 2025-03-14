
import { useToast } from "@/hooks/use-toast";

type MediaType = 'image' | 'video' | 'gif';

export const useMediaUpload = (onUploadComplete: (dataUrl: string) => Promise<void>) => {
  const { toast } = useToast();

  // File upload handler
  const handleFileUpload = async (type: MediaType) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'image' ? 'image/*' : 
                  type === 'video' ? 'video/*' : 
                  'image/gif';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const reader = new FileReader();
          reader.onload = async (e) => {
            const content = e.target?.result as string;
            await onUploadComplete(content);
          };
          reader.onerror = () => {
            toast({
              title: "Upload Error",
              description: "Failed to process the selected file",
              variant: "destructive"
            });
          };
          reader.readAsDataURL(file);
        } catch (error) {
          console.error("File upload error:", error);
          toast({
            title: "File Error",
            description: "There was a problem uploading your file",
            variant: "destructive"
          });
        }
      }
    };
    input.click();
  };

  // Download media
  const handleDownloadMedia = (content: string, type: string) => {
    const link = document.createElement('a');
    link.href = content;
    link.download = `bubble-media-${Date.now()}.${type}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    handleFileUpload,
    handleDownloadMedia
  };
};
