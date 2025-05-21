
import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";

interface AvatarUploadProps {
  userId: string;
  avatarUrl: string | null;
  displayName: string | null;
  size?: "sm" | "md" | "lg";
}

const AvatarUpload = ({ 
  userId, 
  avatarUrl, 
  displayName,
  size = "lg" 
}: AvatarUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { uploadAvatar, isUploading } = useAvatarUpload(userId);
  
  // Determine avatar size class
  const sizeClass = {
    sm: "h-12 w-12",
    md: "h-20 w-20",
    lg: "h-32 w-32"
  }[size];
  
  // Get initials for fallback
  const getInitials = () => {
    if (!displayName) return "?";
    return displayName
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Create a preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    
    // Upload the file
    await uploadAvatar(file);
    
    // Clean up the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Determine which avatar URL to show
  const displayUrl = previewUrl || avatarUrl;

  return (
    <div className="relative flex flex-col items-center">
      <Avatar className={`${sizeClass} border-2 border-[#ebbd34]/20`}>
        <AvatarImage src={displayUrl || undefined} alt={displayName || "Profile"} />
        <AvatarFallback className="bg-[#ebbd34]/10 text-[#ebbd34]">
          {getInitials()}
        </AvatarFallback>
      </Avatar>
      
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />
      
      <Button
        type="button"
        onClick={handleButtonClick}
        disabled={isUploading}
        className="absolute bottom-0 right-0 rounded-full h-8 w-8 p-0 bg-[#ebbd34] hover:bg-[#ebbd34]/90"
        aria-label="Upload avatar"
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin text-white" />
        ) : (
          <Camera className="h-4 w-4 text-white" />
        )}
      </Button>
    </div>
  );
};

export default AvatarUpload;
