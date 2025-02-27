
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { UploadCloud, User, Pencil, Check, X } from "lucide-react";

const profileSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }),
  display_name: z.string().min(1, {
    message: "Display name is required.",
  }),
  avatar_url: z.string().nullable(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function Profile() {
  const { user, profile, isLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState<ProfileFormValues>({
    username: "",
    display_name: "",
    avatar_url: null,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: formData,
  });

  // Initialize form with profile data when it's available
  useEffect(() => {
    if (profile) {
      console.log("Profile data loaded:", profile);
      const initialData = {
        username: profile.username || "",
        display_name: profile.display_name || "",
        avatar_url: profile.avatar_url,
      };
      setFormData(initialData);
      form.reset(initialData);
    }
  }, [profile, form]);

  // Show a loading state or error if profile is missing but auth is completed
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto border-4 border-[#ebbd34] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-lg text-[#ebbd34]">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC]">
        <div className="text-center">
          <p className="mt-4 text-lg text-red-500">Authentication required</p>
          <Button 
            onClick={() => window.location.href = '/auth'} 
            className="mt-4 bg-[#ebbd34] hover:bg-[#ebbd34]/90"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // Handle avatar upload
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file || !user) {
        console.error("No file selected or user not logged in");
        return;
      }

      setIsUploading(true);
      toast({
        title: "Uploading...",
        description: "Your profile picture is being uploaded",
      });

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 2MB",
          variant: "destructive"
        });
        setIsUploading(false);
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive"
        });
        setIsUploading(false);
        return;
      }

      // Create a unique filename using the user's ID
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload image to storage
      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = publicUrlData?.publicUrl;
      
      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error("Profile update error:", updateError);
        throw updateError;
      }

      // Update form data
      setFormData(prev => ({
        ...prev,
        avatar_url: avatarUrl
      }));
      form.setValue('avatar_url', avatarUrl);

      // Refresh profile data
      queryClient.invalidateQueries({ queryKey: ['profile'] });

      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully",
      });
    } catch (error: any) {
      console.error("Upload process error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "There was a problem uploading your image",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleProfileUpdate = async (data: ProfileFormValues) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: data.username,
          display_name: data.display_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });

      setIsEditing(false);
      setFormData(data);
      
      // Refresh profile data
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "There was a problem updating your profile",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset(formData);
    setIsEditing(false);
  };

  // Fallback profile data if profile is null but user exists
  const fallbackProfile = {
    username: user?.email?.split('@')[0] || "user",
    display_name: user?.email?.split('@')[0] || "User",
    avatar_url: null,
    updated_at: new Date().toISOString()
  };

  const displayProfile = profile || fallbackProfile;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC] py-8 px-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="relative h-32 bg-gradient-to-r from-[#FEF7E4] to-[#ebbd34]/50">
          <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-white">
                {formData.avatar_url ? (
                  <AvatarImage src={formData.avatar_url} alt={formData.display_name} />
                ) : (
                  <AvatarFallback className="bg-[#ebbd34]/20">
                    <User className="w-12 h-12 text-[#ebbd34]" />
                  </AvatarFallback>
                )}
              </Avatar>
              <label 
                className="absolute bottom-0 right-0 bg-[#ebbd34] text-white p-1.5 rounded-full cursor-pointer shadow-md hover:bg-[#ebbd34]/90 transition-colors"
                htmlFor="avatar-upload"
              >
                {isUploading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Pencil className="w-4 h-4" />
                )}
              </label>
              <input 
                id="avatar-upload" 
                type="file" 
                accept="image/*" 
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={isUploading}
              />
            </div>
          </div>
        </div>

        <div className="pt-16 pb-8 px-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Profile</h1>
            {!isEditing ? (
              <Button 
                onClick={() => setIsEditing(true)} 
                variant="outline" 
                size="sm"
                className="text-[#ebbd34] border-[#ebbd34] hover:bg-[#ebbd34]/10"
              >
                <Pencil className="w-4 h-4 mr-1" />
                Edit
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button 
                  onClick={handleCancel} 
                  variant="outline" 
                  size="sm"
                  className="text-red-500 border-red-500 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
                <Button 
                  onClick={form.handleSubmit(handleProfileUpdate)} 
                  variant="default" 
                  size="sm"
                  className="bg-[#ebbd34] hover:bg-[#ebbd34]/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                  ) : (
                    <Check className="w-4 h-4 mr-1" />
                  )}
                  Save
                </Button>
              </div>
            )}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleProfileUpdate)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</Label>
                    <FormControl>
                      <Input
                        {...field}
                        id="username"
                        disabled={!isEditing || isSubmitting}
                        className={`mt-1 block w-full rounded-md ${
                          isEditing ? "border-[#ebbd34]/30 focus-visible:ring-[#ebbd34]/20" : "bg-gray-50"
                        }`}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="display_name"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="display_name" className="block text-sm font-medium text-gray-700">Display Name</Label>
                    <FormControl>
                      <Input
                        {...field}
                        id="display_name"
                        disabled={!isEditing || isSubmitting}
                        className={`mt-1 block w-full rounded-md ${
                          isEditing ? "border-[#ebbd34]/30 focus-visible:ring-[#ebbd34]/20" : "bg-gray-50"
                        }`}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4">
                <div className="flex items-center text-sm text-gray-500">
                  <UploadCloud className="w-4 h-4 mr-1 text-[#ebbd34]" />
                  <p>Email: {user.email}</p>
                </div>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <UploadCloud className="w-4 h-4 mr-1 text-[#ebbd34]" />
                  <p>Last updated: {new Date(displayProfile.updated_at).toLocaleDateString()}</p>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
