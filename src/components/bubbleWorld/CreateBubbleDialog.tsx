
import React, { useState } from "react";
import { Plus, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateBubbleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateBubbleDialog: React.FC<CreateBubbleDialogProps> = ({ open, onOpenChange }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [newBubbleInfo, setNewBubbleInfo] = useState({
    name: "",
    topic: "general",
    description: "",
  });
  const [isCreatingBubble, setIsCreatingBubble] = useState(false);

  const handleCreateBubble = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create bubbles",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsCreatingBubble(true);
      
      // Simple validation
      if (!newBubbleInfo.name.trim()) {
        toast({
          title: "Missing information",
          description: "Please provide a name for your bubble",
          variant: "destructive"
        });
        return;
      }
      
      // Set expiry date to 24 hours from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      const username = profile?.username || user?.email || "";
      
      const { data, error } = await supabase
        .from('bubbles')
        .insert({
          name: newBubbleInfo.name,
          topic: newBubbleInfo.topic || "general",
          description: newBubbleInfo.description,
          size: 'sm' as const, // Explicitly type as 'sm'
          reflect_count: 0,
          expires_at: expiresAt.toISOString(),
          username: username
        })
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      toast({
        title: "Bubble Created!",
        description: `Your bubble "${newBubbleInfo.name}" will be active for 24 hours`
      });
      
      // Reset form and close dialog
      setNewBubbleInfo({
        name: "",
        topic: "general",
        description: ""
      });
      onOpenChange(false);
      
      // Refresh bubbles list
      queryClient.invalidateQueries({ queryKey: ['bubbles'] });
      
      // Navigate to the new bubble's chat page
      if (data) {
        navigate(`/bubble/${data.id}`);
      }
    } catch (error: any) {
      console.error("Error creating bubble:", error);
      toast({
        title: "Error creating bubble",
        description: error.message || "An error occurred while creating your bubble",
        variant: "destructive"
      });
    } finally {
      setIsCreatingBubble(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-lg p-6 bg-white/95 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="text-2xl text-[#ebbd34] font-bold">Create a 24h Bubble</DialogTitle>
          <DialogDescription className="text-base">
            Create a new bubble that will last for exactly 24 hours before exploding.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-[#ebbd34] font-medium">Name</Label>
            <Input
              id="name"
              value={newBubbleInfo.name}
              onChange={(e) => setNewBubbleInfo(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter bubble name"
              maxLength={50}
              className="bg-white/80 h-11 text-base"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="topic" className="text-[#ebbd34] font-medium">Topic</Label>
            <Select
              value={newBubbleInfo.topic}
              onValueChange={(value) => setNewBubbleInfo(prev => ({ ...prev, topic: value }))}
            >
              <SelectTrigger id="topic" className="bg-white/80 h-11 text-base">
                <SelectValue placeholder="Select a topic" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="tech">Technology</SelectItem>
                <SelectItem value="science">Science</SelectItem>
                <SelectItem value="arts">Arts & Culture</SelectItem>
                <SelectItem value="social">Social</SelectItem>
                <SelectItem value="health">Health & Wellness</SelectItem>
                <SelectItem value="education">Education</SelectItem>
                <SelectItem value="gaming">Gaming</SelectItem>
                <SelectItem value="sports">Sports</SelectItem>
                <SelectItem value="food">Food & Cooking</SelectItem>
                <SelectItem value="travel">Travel</SelectItem>
                <SelectItem value="music">Music</SelectItem>
                <SelectItem value="movies">Movies & TV</SelectItem>
                <SelectItem value="books">Books & Literature</SelectItem>
                <SelectItem value="environment">Environment</SelectItem>
                <SelectItem value="business">Business & Finance</SelectItem>
                <SelectItem value="philosophy">Philosophy</SelectItem>
                <SelectItem value="politics">Politics</SelectItem>
                <SelectItem value="news">Current Events</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description" className="text-[#ebbd34] font-medium">Description (Optional)</Label>
            <Textarea
              id="description"
              value={newBubbleInfo.description}
              onChange={(e) => setNewBubbleInfo(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter a brief description"
              className="resize-none bg-white/80 text-base"
              rows={4}
              maxLength={200}
            />
          </div>
          <div className="flex items-center rounded-lg bg-[#ebbd34]/10 p-4 mt-2">
            <Clock className="h-6 w-6 text-[#ebbd34] mr-3 flex-shrink-0" />
            <span className="text-sm text-[#ebbd34]">
              This bubble will automatically expire after 24 hours. Join conversations and reflect on ideas before they disappear!
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant={isCreatingBubble ? "outline" : "default"}
            onClick={handleCreateBubble}
            disabled={isCreatingBubble || !newBubbleInfo.name.trim()}
            className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white w-full sm:w-auto py-6 text-base"
            size="lg"
          >
            {isCreatingBubble ? (
              <>
                <span className="mr-2">Creating...</span>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              </>
            ) : "Create 24h Bubble"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateBubbleDialog;
