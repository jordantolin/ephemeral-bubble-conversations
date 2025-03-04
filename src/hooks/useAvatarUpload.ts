
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';

export const useAvatarUpload = (userId: string) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { updateProfile } = useAuth();

  const uploadAvatar = async (file: File) => {
    if (!file) return null;
    
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 2MB",
        variant: "destructive",
      });
      return null;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return null;
    }

    try {
      setIsUploading(true);
      
      // Create a unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${fileName}`;
      
      console.log("Starting avatar upload process...");
      
      // Check if avatars bucket exists
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.log("Error checking buckets:", bucketsError);
        // Continue anyway as we'll try to upload and handle any errors
      }
      
      const hasAvatarsBucket = buckets?.some(bucket => bucket.name === 'avatars');
      
      console.log("Avatars bucket exists:", hasAvatarsBucket);
      
      // Try to create the bucket if it doesn't exist (may fail if user doesn't have permissions)
      if (!hasAvatarsBucket) {
        try {
          console.log("Attempting to create avatars bucket");
          const { data, error } = await supabase.storage.createBucket('avatars', {
            public: true,
            fileSizeLimit: 2 * 1024 * 1024, // 2MB
          });
          console.log("Bucket creation result:", data, error);
        } catch (err) {
          console.error("Failed to create avatars bucket:", err);
          // Continue anyway, as this is expected in production environments
        }
      }
      
      // Upload the file
      console.log("Uploading file to path:", filePath);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      console.log("Upload successful, getting public URL");
      
      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (!publicUrlData) {
        console.error("Failed to get public URL");
        throw new Error("Failed to get public URL");
      }
      
      const publicUrl = publicUrlData.publicUrl;
      console.log("Public URL obtained:", publicUrl);

      // Update the profile with the new avatar URL using updateProfile from AuthContext
      console.log("Updating profile with new avatar URL");
      const { success, error } = await updateProfile({ avatar_url: publicUrl });

      if (!success) {
        console.error("Profile update error:", error);
        throw error;
      }

      // Invalidate profile query to refresh data
      console.log("Invalidating profile cache");
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully",
      });
      
      return publicUrl;
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload avatar",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadAvatar,
    isUploading,
  };
};
