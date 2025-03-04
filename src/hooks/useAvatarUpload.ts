
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

export const useAvatarUpload = (userId: string) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { uploadAvatar } = useAuth();

  const uploadAvatarFile = async (file: File) => {
    if (!file) return null;

    setIsUploading(true);
    
    try {
      const result = await uploadAvatar(file);
      
      if (!result.success) {
        throw new Error(result.error || "Failed to upload avatar");
      }
      
      return result.url;
    } catch (error: any) {
      toast({
        title: "Error uploading avatar",
        description: error.message || "There was a problem uploading your avatar",
        variant: "destructive",
      });
      console.error("Avatar upload error:", error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadAvatar: uploadAvatarFile,
    isUploading
  };
};
