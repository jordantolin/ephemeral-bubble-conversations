
import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AvatarUploadProps {
  currentAvatarUrl: string | null;
  userId: string;
  username: string;
  displayName: string | null;
  onAvatarUpdated: (url: string) => void;
}

const AvatarUpload = ({ 
  currentAvatarUrl, 
  userId, 
  username, 
  displayName, 
  onAvatarUpdated 
}: AvatarUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(currentAvatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const getAvatarFallback = () => {
    if (displayName) {
      const nameParts = displayName.split(" ");
      if (nameParts.length >= 2) {
        return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
      }
      return displayName.substring(0, 2).toUpperCase();
    }
    
    return username.substring(0, 2).toUpperCase();
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const checkStorageBucket = async (bucketName: string): Promise<boolean> => {
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.log("Storage bucket check failed:", error.message);
        return true; // Assume bucket exists to attempt the upload anyway
      }
      
      return buckets?.some(bucket => bucket.name === bucketName) || false;
    } catch (error) {
      console.log("Error checking storage bucket:", error);
      return false;
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file || !userId) {
        console.error("No file selected or user not logged in");
        return;
      }

      setIsUploading(true);

      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 2MB",
          variant: "destructive"
        });
        setIsUploading(false);
        return;
      }

      // Set preview image immediately for better UX
      const objectUrl = URL.createObjectURL(file);
      setPreviewImage(objectUrl);

      // Check if avatars bucket exists
      const bucketExists = await checkStorageBucket('avatars');
      if (!bucketExists) {
        toast({
          title: "Storage not ready",
          description: "The avatars storage is being set up. Please try again later.",
          variant: "destructive"
        });
        setIsUploading(false);
        return;
      }

      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const safeFileExt = fileExt || 'jpg'; // Fallback extension
      const fileName = `avatar_${userId}_${Date.now()}.${safeFileExt}`;
      const filePath = fileName;

      console.log("Uploading file to avatars bucket, path:", filePath);

      // Upload image to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type 
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        
        if (uploadError.message.includes('bucket') && uploadError.message.includes('not found')) {
          toast({
            title: "Storage setup needed",
            description: "Please contact the administrator to set up avatar storage.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Upload failed",
            description: uploadError.message || "There was a problem uploading your image",
            variant: "destructive"
          });
        }
        setIsUploading(false);
        return;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = publicUrlData?.publicUrl;
      
      if (avatarUrl) {
        onAvatarUpdated(avatarUrl);
        
        toast({
          title: "Avatar uploaded",
          description: "Your profile picture has been updated",
        });
      }
    } catch (error: any) {
      console.error("Upload process error:", error);
      // Revert preview image on error
      setPreviewImage(currentAvatarUrl);
      toast({
        title: "Upload failed",
        description: error.message || "There was a problem uploading your image",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleAvatarUpload}
        disabled={isUploading}
      />
      
      {/* Avatar with upload overlay */}
      <div className="relative cursor-pointer group" onClick={triggerFileInput}>
        <Avatar className="w-24 h-24 border-4 border-[#ebbd34] group-hover:opacity-80 transition-opacity overflow-hidden">
          {isUploading ? (
            <div className="h-full w-full flex items-center justify-center bg-[#ebbd34]/10">
              <Loader2 className="w-8 h-8 text-[#ebbd34] animate-spin" />
            </div>
          ) : (
            <>
              <AvatarImage 
                src={previewImage || undefined} 
                alt={displayName || username} 
                className="object-cover"
              />
              <AvatarFallback className="bg-[#ebbd34] text-white">
                {getAvatarFallback()}
              </AvatarFallback>
            </>
          )}
        </Avatar>
        
        {/* Upload overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
          <Upload className="h-5 w-5 mb-1" />
          {isUploading ? "Uploading..." : "Change Photo"}
        </div>
      </div>
      
      <p className="text-xs text-gray-500 text-center mt-1 max-w-[150px]">
        Click the avatar to upload a new profile picture
      </p>
    </div>
  );
};

export default AvatarUpload;
