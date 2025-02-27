import { useState, useEffect, useRef } from "react";
import BubbleWorld from "@/components/BubbleWorld";
import { Button } from "@/components/ui/button";
import { MessageCircle, Search, User, TrendingUp, Plus, Send, Image, Video, Mic, SmilePlus, Star, X, StopCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const Index = () => {
  const [isCreateBubbleOpen, setIsCreateBubbleOpen] = useState(false);
  const [bubbleName, setBubbleName] = useState("");
  const [bubbleDescription, setBubbleDescription] = useState("");
  const [bubbleCategory, setBubbleCategory] = useState("General");
  const [messageText, setMessageText] = useState("");
  const [isMessageOptionsOpen, setIsMessageOptionsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]);
  const [selectedEmoji, setSelectedEmoji] = useState(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isBubbleOptionsOpen, setIsBubbleOptionsOpen] = useState(false);
  const [selectedBubble, setSelectedBubble] = useState(null);
  const [isEditBubbleOpen, setIsEditBubbleOpen] = useState(false);
  const [editedBubbleName, setEditedBubbleName] = useState("");
  const [editedBubbleDescription, setEditedBubbleDescription] = useState("");
  const [editedBubbleCategory, setEditedBubbleCategory] = useState("General");
  const [isDeleteBubbleOpen, setIsDeleteBubbleOpen] = useState(false);
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const audioRecorder = useRef(null);
  const [audioStream, setAudioStream] = useState(null);

  const { data: bubbles, isLoading, isError } = useQuery({
    queryKey: ['bubbles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bubbles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching bubbles:", error);
        throw new Error(error.message);
      }

      return data;
    },
  });

  useEffect(() => {
    if (isRecording && !audioRecorder.current) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          setAudioStream(stream);
          audioRecorder.current = new MediaRecorder(stream);
          audioRecorder.current.ondataavailable = (event) => {
            const audioBlob = new Blob([event.data], { type: 'audio/webm' });
            setAudioURL(URL.createObjectURL(audioBlob));
          };
          audioRecorder.current.start();
        })
        .catch(error => {
          console.error("Error accessing microphone:", error);
          toast({
            title: "Microphone Access Denied",
            description: "Please allow microphone access to record audio messages.",
            variant: "destructive",
          });
          setIsRecording(false);
        });
    }

    return () => {
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isRecording, toast]);

  const handleCreateBubble = async () => {
    if (!bubbleName || !bubbleDescription) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields to create a bubble.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('bubbles')
        .insert([{ name: bubbleName, description: bubbleDescription, category: bubbleCategory }])
        .select();

      if (error) {
        console.error("Error creating bubble:", error);
        toast({
          title: "Error Creating Bubble",
          description: "There was an error creating the bubble. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Bubble Created",
        description: "Your bubble has been successfully created!",
      });

      queryClient.invalidateQueries({ queryKey: ['bubbles'] });
      setIsCreateBubbleOpen(false);
      setBubbleName("");
      setBubbleDescription("");
      setBubbleCategory("General");
    } catch (error) {
      console.error("Unexpected error creating bubble:", error);
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred. Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = () => {
    if (!messageText.trim() && !audioURL && mediaFiles.length === 0) {
      toast({
        title: "Empty Message",
        description: "Please enter a message or attach media to send.",
        variant: "destructive",
      });
      return;
    }

    console.log("Sending message:", {
      text: messageText,
      audio: audioURL,
      media: mediaFiles,
    });

    setMessageText("");
    setAudioURL("");
    setMediaFiles([]);
    setIsMessageOptionsOpen(false);
    setSelectedEmoji(null);
    setIsEmojiPickerOpen(false);

    toast({
      title: "Message Sent",
      description: "Your message has been sent!",
    });
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    setMediaFiles(prevFiles => [...prevFiles, ...files]);
  };

  const handleEmojiSelect = (emoji) => {
    setMessageText(prevText => prevText + emoji.native);
    setSelectedEmoji(emoji);
    setIsEmojiPickerOpen(false);
  };

  const handleStartRecording = () => {
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    if (audioRecorder.current) {
      audioRecorder.current.stop();
      audioStream.getTracks().forEach(track => track.stop());
    }
  };

  const handleEditBubble = (bubble) => {
    setSelectedBubble(bubble);
    setEditedBubbleName(bubble.name);
    setEditedBubbleDescription(bubble.description);
    setEditedBubbleCategory(bubble.category);
    setIsEditBubbleOpen(true);
  };

  const handleUpdateBubble = async () => {
    if (!editedBubbleName || !editedBubbleDescription) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields to update the bubble.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('bubbles')
        .update({
          name: editedBubbleName,
          description: editedBubbleDescription,
          category: editedBubbleCategory,
        })
        .eq('id', selectedBubble.id)
        .select();

      if (error) {
        console.error("Error updating bubble:", error);
        toast({
          title: "Error Updating Bubble",
          description: "There was an error updating the bubble. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Bubble Updated",
        description: "The bubble has been successfully updated!",
      });

      queryClient.invalidateQueries({ queryKey: ['bubbles'] });
      setIsEditBubbleOpen(false);
      setSelectedBubble(null);
    } catch (error) {
      console.error("Unexpected error updating bubble:", error);
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred. Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteBubble = (bubble) => {
    setSelectedBubble(bubble);
    setIsDeleteBubbleOpen(true);
  };

  const handleConfirmDeleteBubble = async () => {
    try {
      const { data, error } = await supabase
        .from('bubbles')
        .delete()
        .eq('id', selectedBubble.id);

      if (error) {
        console.error("Error deleting bubble:", error);
        toast({
          title: "Error Deleting Bubble",
          description: "There was an error deleting the bubble. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Bubble Deleted",
        description: "The bubble has been successfully deleted!",
      });

      queryClient.invalidateQueries({ queryKey: ['bubbles'] });
      setIsDeleteBubbleOpen(false);
      setSelectedBubble(null);
    } catch (error) {
      console.error("Unexpected error deleting bubble:", error);
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred. Please try again later.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC] font-montserrat">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#ebbd34]/10">
        <div className="container mx-auto">
          <div className="flex items-center justify-between h-16 px-2 sm:px-4">
            {/* Logo and Search Section */}
            <div className="flex items-center gap-2 sm:gap-6 flex-1">
              <div className="flex items-center gap-2 shrink-0">
                <img 
                  src="/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png"
                  alt="Bubble Trouble"
                  className="w-7 h-7 sm:w-8 sm:h-8"
                />
                <span className="text-sm sm:text-xl font-semibold text-[#ebbd34] whitespace-nowrap">
                  Bubble Trouble
                </span>
              </div>
              
              <div className="relative flex-1 max-w-md hidden sm:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#ebbd34]/70 w-4 h-4" />
                <input
                  type="search"
                  placeholder="Search in the bubbles world..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-full bg-[#ebbd34]/5 border-none text-[#ebbd34] placeholder-[#ebbd34]/50 focus:ring-2 focus:ring-[#ebbd34]/20 focus:outline-none"
                />
              </div>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center gap-1">
              <Link 
                to="/feed" 
                className={`nav-link flex items-center gap-1 px-2 sm:px-4 py-2 rounded-full text-[#ebbd34] hover:bg-[#ebbd34]/5 transition-colors ${
                  location.pathname === '/feed' ? 'bg-[#ebbd34]/10' : ''
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Feed</span>
              </Link>
              <Link 
                to="/profile" 
                className="p-2 hover:bg-[#ebbd34]/5 rounded-full text-[#ebbd34] transition-colors"
              >
                <User className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Mobile Search Bar */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#ebbd34]/10 sm:hidden">
        <div className="px-2 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-[#ebbd34]/70 w-4 h-4" />
            <input
              type="search"
              placeholder="Search bubbles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-full bg-[#ebbd34]/5 border-none text-[#ebbd34] placeholder-[#ebbd34]/50 focus:ring-2 focus:ring-[#ebbd34]/20 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto pt-20 sm:pt-24 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#ebbd34]">
            Explore Bubbles
          </h1>
          <Button onClick={() => setIsCreateBubbleOpen(true)} className="bg-[#ebbd34] text-white hover:bg-[#ca9627] shadow-sm">
            <Plus className="w-4 h-4 mr-2" />
            Create Bubble
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center text-gray-500">Loading bubbles...</div>
        ) : isError ? (
          <div className="text-center text-red-500">Error loading bubbles. Please try again.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bubbles && bubbles.map((bubble) => (
              <div key={bubble.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-[#ebbd34]">{bubble.name}</h2>
                    <Button variant="ghost" size="icon" onClick={() => handleEditBubble(bubble)} className="hover:bg-[#ebbd34]/10 text-[#ebbd34]">
                      <MessageCircle className="w-5 h-5" />
                    </Button>
                  </div>
                  <p className="text-gray-600 mt-2">{bubble.description}</p>
                  <div className="mt-4">
                    <span className="inline-block bg-[#ebbd34]/10 rounded-full px-3 py-1 text-sm font-semibold text-[#ebbd34] mr-2 mb-2">
                      {bubble.category}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Bubble Dialog */}
      <Dialog open={isCreateBubbleOpen} onOpenChange={setIsCreateBubbleOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create a New Bubble</DialogTitle>
            <DialogDescription>
              Create your own space for discussions and sharing.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input id="name" value={bubbleName} onChange={(e) => setBubbleName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea id="description" value={bubbleDescription} onChange={(e) => setBubbleDescription(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Category
              </Label>
              <Select value={bubbleCategory} onValueChange={setBubbleCategory}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Technology">Technology</SelectItem>
                  <SelectItem value="Sports">Sports</SelectItem>
                  <SelectItem value="Entertainment">Entertainment</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsCreateBubbleOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" onClick={handleCreateBubble}>Create Bubble</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Bubble Dialog */}
      <Dialog open={isEditBubbleOpen} onOpenChange={() => setIsEditBubbleOpen(false)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Bubble</DialogTitle>
            <DialogDescription>
              Update the details of your bubble.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input id="edit-name" value={editedBubbleName} onChange={(e) => setEditedBubbleName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right">
                Description
              </Label>
              <Textarea id="edit-description" value={editedBubbleDescription} onChange={(e) => setEditedBubbleDescription(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-category" className="text-right">
                Category
              </Label>
              <Select value={editedBubbleCategory} onValueChange={setEditedBubbleCategory}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Technology">Technology</SelectItem>
                  <SelectItem value="Sports">Sports</SelectItem>
                  <SelectItem value="Entertainment">Entertainment</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsEditBubbleOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" onClick={handleUpdateBubble}>Update Bubble</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Bubble Dialog */}
      <Dialog open={isDeleteBubbleOpen} onOpenChange={() => setIsDeleteBubbleOpen(false)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Bubble</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this bubble? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsDeleteBubbleOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" onClick={handleConfirmDeleteBubble}>
              Delete Bubble
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
