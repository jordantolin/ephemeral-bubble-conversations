
import React, { useState } from "react";
import { PlusCircle, Loader2, MapPin, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useBubbleCreation } from "@/hooks/useBubbleCreation";
import { useGamification } from "@/context/GamificationContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CreateBubbleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateBubbleDialog: React.FC<CreateBubbleDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { addPoints, checkAchievement } = useGamification();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("");
  
  // Use the hook with an onSuccess callback to handle achievements after creation
  const { 
    form, 
    isSubmitting, 
    onSubmit, 
    isGettingLocation, 
    locationError, 
    hasLocation 
  } = useBubbleCreation(() => {
    // This will run after successful bubble creation
    
    // Reset form values
    setName("");
    setDescription("");
    setTopic("");
    
    // Close dialog
    onOpenChange(false);
    
    // Refresh bubbles query
    queryClient.invalidateQueries({ queryKey: ['bubbles'] });
  });
  
  const handleCreateBubble = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create a bubble",
        variant: "destructive"
      });
      return;
    }
    
    if (!name.trim() || !topic.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both a name and topic for your bubble",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Set the form values
      form.setValue("name", name);
      form.setValue("topic", topic);
      form.setValue("description", description);
      
      // Submit the form
      await onSubmit();
      
      // Add points for creating a bubble - will be called after successful creation
      await addPoints(20, 'bubble');
      
      // Check first bubble achievement
      await checkAchievement('first-bubble');
      
      // Show success toast
      toast({
        title: "Bubble created!",
        description: "Your bubble has been created successfully.",
      });
    } catch (error) {
      console.error("Error creating bubble:", error);
      
      toast({
        title: "Error creating bubble",
        description: "Failed to create your bubble. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Render location status
  const renderLocationStatus = () => {
    if (isGettingLocation) {
      return (
        <Alert className="mt-2">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <AlertDescription>
            Getting your location to place your bubble on the map...
          </AlertDescription>
        </Alert>
      );
    }
    
    if (locationError) {
      return (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription>{locationError}</AlertDescription>
        </Alert>
      );
    }
    
    if (hasLocation) {
      return (
        <Alert className="mt-2 bg-[#ebbd34]/10 text-[#ebbd34] border-[#ebbd34]/20">
          <MapPin className="h-4 w-4 mr-2" />
          <AlertDescription>
            Your bubble will be placed on the map at your current location.
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-[#ebbd34] flex items-center">
            <PlusCircle className="h-5 w-5 mr-2" />
            Create New Bubble
          </DialogTitle>
          <DialogDescription>
            Create a new bubble that will last for 24 hours. Invite others to join your conversation!
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bubble-name" className="text-right">
              Name
            </Label>
            <Input
              id="bubble-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My awesome bubble"
              className="col-span-3"
              maxLength={50}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bubble-topic" className="text-right">
              Topic
            </Label>
            <Select
              value={topic}
              onValueChange={setTopic}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Technology">Technology</SelectItem>
                <SelectItem value="Science">Science</SelectItem>
                <SelectItem value="Art">Art</SelectItem>
                <SelectItem value="Movies">Movies</SelectItem>
                <SelectItem value="Music">Music</SelectItem>
                <SelectItem value="Books">Books</SelectItem>
                <SelectItem value="Gaming">Gaming</SelectItem>
                <SelectItem value="Food">Food</SelectItem>
                <SelectItem value="Travel">Travel</SelectItem>
                <SelectItem value="Sports">Sports</SelectItem>
                <SelectItem value="Philosophy">Philosophy</SelectItem>
                <SelectItem value="Education">Education</SelectItem>
                <SelectItem value="Personal">Personal</SelectItem>
                <SelectItem value="Random">Random</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bubble-description" className="text-right">
              Description
            </Label>
            <Textarea
              id="bubble-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What would you like to discuss in this bubble? (optional)"
              className="col-span-3"
              maxLength={200}
            />
          </div>
          
          {/* Location Status */}
          {renderLocationStatus()}
        </div>
        
        <DialogFooter>
          <Button
            type="submit"
            onClick={handleCreateBubble}
            disabled={isSubmitting || !name.trim() || !topic.trim()}
            className="bg-[#ebbd34] hover:bg-[#ebbd34]/80 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Bubble'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateBubbleDialog;
