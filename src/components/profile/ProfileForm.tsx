import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

interface ProfileFormProps {
  userId: string;
  initialUsername: string;
  initialDisplayName: string | null;
  avatarUrl: string | null;
  onCancel: () => void;
}

interface FormErrors {
  username?: string;
  displayName?: string;
}

const ProfileForm = ({ 
  userId, 
  initialUsername, 
  initialDisplayName, 
  avatarUrl,
  onCancel 
}: ProfileFormProps) => {
  const [username, setUsername] = useState(initialUsername);
  const [displayName, setDisplayName] = useState(initialDisplayName || "");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { updateProfile } = useAuth();

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    if (!username.trim()) {
      newErrors.username = "Username is required";
      isValid = false;
    } else if (username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
      isValid = false;
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = "Username can only contain letters, numbers, and underscores";
      isValid = false;
    }

    if (!displayName.trim()) {
      newErrors.displayName = "Display name is required";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      // Use updateProfile from AuthContext
      const { success, error } = await updateProfile({
        username,
        display_name: displayName
      });
      
      if (!success) {
        throw error || new Error("Failed to update profile");
      }

      // Refresh profile data
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully"
      });
      
      onCancel(); // Exit edit mode
    } catch (error: any) {
      console.error("Profile update error:", error);
      toast({
        title: "Error updating profile",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.form 
      onSubmit={handleSubmit} 
      className="w-full space-y-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div>
        <Label htmlFor="display_name" className="text-[#ebbd34] font-medium">Display Name</Label>
        <Input
          id="display_name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
          className="mt-1 border-[#ebbd34]/20 focus:border-[#ebbd34] focus:ring-[#ebbd34]/20 
                   transition-colors duration-200"
        />
        {errors.displayName && (
          <motion.p 
            className="text-red-500 text-xs mt-1"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            {errors.displayName}
          </motion.p>
        )}
      </div>
      
      <div>
        <Label htmlFor="username" className="text-[#ebbd34] font-medium">Username</Label>
        <div className="relative">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">@</span>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            className="pl-7 mt-1 border-[#ebbd34]/20 focus:border-[#ebbd34] focus:ring-[#ebbd34]/20 
                     transition-colors duration-200"
          />
        </div>
        {errors.username ? (
          <motion.p 
            className="text-red-500 text-xs mt-1"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            {errors.username}
          </motion.p>
        ) : (
          <p className="text-xs text-gray-500 mt-1">This will be used as your @username</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button 
          type="button"
          variant="outline" 
          onClick={onCancel}
          className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors duration-200"
        >
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button 
          type="submit"
          className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white gap-1.5 transition-colors duration-200"
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>Save</span>
        </Button>
      </div>
    </motion.form>
  );
};

export default ProfileForm;
