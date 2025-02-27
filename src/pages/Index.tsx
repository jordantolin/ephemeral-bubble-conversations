import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Send, Plus } from "lucide-react";
import { useUser } from "@/context/UserContext";

interface Bubble {
  id: string;
  name: string;
  description: string;
  created_at: string;
  user_id: string;
  reflections_count: number;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  bubble_id: string;
  username: string;
}

interface Reflection {
  id: string;
  user_id: string;
  bubble_id: string;
  created_at: string;
}

const Index = () => {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const [selectedBubble, setSelectedBubble] = useState<Bubble | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [newBubbleName, setNewBubbleName] = useState("");
  const [newBubbleDescription, setNewBubbleDescription] = useState("");
  const [hasReflected, setHasReflected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user, loading } = useUser();
  const navigate = useNavigate();

  console.log("Index page rendering, loading:", loading, "user:", user ? "exists" : "null");

  // Forward authenticated users to the 3D Feed
  useEffect(() => {
    console.log("Check for redirection, user:", user ? "logged in" : "not logged in", "loading:", loading);
    if (user && !loading) {
      console.log("User is logged in, redirecting to feed");
      navigate("/feed");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchBubbles = async () => {
      console.log("Fetching bubbles...");
      try {
        const { data, error } = await supabase
          .from("bubbles")
          .select("*, reflections(count)")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching bubbles:", error);
          return;
        }

        console.log("Bubbles fetched:", data);
        // Transform the data to include reflections_count
        const bubblesWithCounts = data.map((bubble: any) => ({
          ...bubble,
          reflections_count: bubble.reflections[0]?.count || 0,
        }));

        setBubbles(bubblesWithCounts);
      } catch (e) {
        console.error("Exception while fetching bubbles:", e);
      }
    };

    if (!user) {  // Solo carica le bolle se l'utente non è autenticato
      fetchBubbles();
    }

    // Subscribe to changes
    const bubbleSubscription = supabase
      .channel("bubbles-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bubbles" },
        fetchBubbles
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bubbleSubscription);
    };
  }, [user]);

  useEffect(() => {
    if (selectedBubbleId) {
      const fetchBubble = async () => {
        const { data, error } = await supabase
          .from("bubbles")
          .select("*")
          .eq("id", selectedBubbleId)
          .single();

        if (error) {
          console.error("Error fetching bubble:", error);
          return;
        }

        setSelectedBubble(data);
      };

      const fetchMessages = async () => {
        const { data, error } = await supabase
          .from("messages")
          .select("*, profiles(username)")
          .eq("bubble_id", selectedBubbleId)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Error fetching messages:", error);
          return;
        }

        // Transform the data to include username
        const messagesWithUsername = data.map((message: any) => ({
          ...message,
          username: message.profiles?.username || "Anonymous",
        }));

        setMessages(messagesWithUsername);
      };

      const checkReflection = async () => {
        if (!user) return;

        const { data, error } = await supabase
          .from("reflections")
          .select("*")
          .eq("bubble_id", selectedBubbleId)
          .eq("user_id", user.id)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Error checking reflection:", error);
          return;
        }

        setHasReflected(!!data);
      };

      fetchBubble();
      fetchMessages();
      checkReflection();

      // Subscribe to new messages
      const messageSubscription = supabase
        .channel(`messages-${selectedBubbleId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `bubble_id=eq.${selectedBubbleId}`,
          },
          fetchMessages
        )
        .subscribe();

      return () => {
        supabase.removeChannel(messageSubscription);
      };
    }
  }, [selectedBubbleId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleOpenChat = (bubbleId: string) => {
    setSelectedBubbleId(bubbleId);
    setIsChatOpen(true);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !user || !selectedBubbleId) return;

    try {
      const { error } = await supabase.from("messages").insert({
        content: newMessage,
        user_id: user.id,
        bubble_id: selectedBubbleId,
      });

      if (error) throw error;

      setNewMessage("");
    } catch (error: any) {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateBubble = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newBubbleName.trim() || !user) return;

    try {
      const { data, error } = await supabase
        .from("bubbles")
        .insert({
          name: newBubbleName,
          description: newBubbleDescription || "Join the conversation!",
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setNewBubbleName("");
      setNewBubbleDescription("");
      setIsCreateOpen(false);

      // Open the newly created bubble
      if (data) {
        setSelectedBubbleId(data.id);
        setIsChatOpen(true);
      }
    } catch (error: any) {
      toast({
        title: "Error creating bubble",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReflect = async (bubbleId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to reflect on bubbles",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("reflections").insert({
        user_id: user.id,
        bubble_id: bubbleId,
      });

      if (error) throw error;

      setHasReflected(true);

      // Update the local state to increment the reflection count
      setBubbles((prevBubbles) =>
        prevBubbles.map((bubble) =>
          bubble.id === bubbleId
            ? { ...bubble, reflections_count: bubble.reflections_count + 1 }
            : bubble
        )
      );

      toast({
        title: "Reflected!",
        description: "Your reflection has been recorded",
      });
    } catch (error: any) {
      toast({
        title: "Error reflecting",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Modifica qui: aggiunta una condizione per mostrare un messaggio diverso quando caricamento è finito ma non ci sono utenti
  if (loading) {
    console.log("Showing loading spinner");
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC]">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-[#ebbd34]"></div>
          <p className="text-[#ebbd34]">Caricamento in corso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC] font-montserrat">
      <nav className="sticky top-0 z-10 border-b border-[#ebbd34]/10 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between p-4">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png"
              alt="Bubble Trouble"
              className="h-8 w-8"
            />
            <span className="text-xl font-bold text-[#ebbd34]">
              Bubble Trouble
            </span>
          </Link>
          <div>
            {user ? (
              <div className="flex items-center gap-4">
                <Link to="/feed">
                  <Button className="bg-[#ebbd34] text-white hover:bg-[#ebbd34]/90">
                    Vai al mondo 3D
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="border-[#ebbd34]/20 text-[#ebbd34] hover:bg-[#ebbd34]/10 hover:text-[#ebbd34]"
                  onClick={() => supabase.auth.signOut()}
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <Link to="/auth">
                <Button className="bg-[#ebbd34] text-white hover:bg-[#ebbd34]/90">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl p-4">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#ebbd34] md:text-3xl">
            Bubble Conversations
          </h1>
          {user && (
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-[#ebbd34] text-white hover:bg-[#ebbd34]/90"
            >
              <Plus className="mr-2 h-4 w-4" /> New Bubble
            </Button>
          )}
        </div>

        {bubbles.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-md">
            <p className="text-[#ebbd34]/70">
              No bubbles yet. Be the first to create one!
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bubbles.map((bubble) => (
              <div
                key={bubble.id}
                className="group relative overflow-hidden rounded-xl bg-white p-6 shadow-md transition-all hover:shadow-lg"
              >
                <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-[#ebbd34]/5 transition-all group-hover:bg-[#ebbd34]/10"></div>
                <div className="absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-[#ebbd34]/5 transition-all group-hover:bg-[#ebbd34]/10"></div>

                <h2 className="mb-2 text-xl font-bold text-[#ebbd34]">
                  {bubble.name}
                </h2>
                <p className="mb-4 text-[#ebbd34]/70">
                  {bubble.description || "Join the conversation!"}
                </p>

                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#ebbd34]/20 text-[#ebbd34] hover:bg-[#ebbd34]/10 hover:text-[#ebbd34]"
                    onClick={() => handleOpenChat(bubble.id)}
                  >
                    Join Conversation
                  </Button>
                  <div className="flex items-center gap-1 text-sm text-[#ebbd34]/60">
                    <Sparkles className="h-4 w-4" />
                    <span>{bubble.reflections_count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Chat Dialog - Updated to fix close button positioning */}
      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="sm:max-w-[600px] h-[80vh] sm:h-[700px] flex flex-col p-0 border-none bg-[#FEF7E4] rounded-[2rem] overflow-hidden shadow-2xl">
          <div className="absolute right-4 top-4 z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsChatOpen(false)}
              className="h-6 w-6 rounded-full bg-[#ebbd34]/10 text-[#ebbd34] hover:bg-[#ebbd34]/20 hover:text-[#ebbd34]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span className="sr-only">Close</span>
            </Button>
          </div>
          
          <DialogHeader className="flex flex-row items-center justify-between p-4 border-b border-[#ebbd34]/10 bg-gradient-to-r from-[#ebbd34]/5 to-[#ebbd34]/10">
            <div>
              <DialogTitle className="text-[#ebbd34] text-xl">{selectedBubble?.name}</DialogTitle>
              <DialogDescription className="text-[#ebbd34]/70">
                {selectedBubble?.description}
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="icon"
              className={`ml-4 hover:bg-[#ebbd34]/10 transition-colors border-[#ebbd34]/20 ${hasReflected ? 'bg-[#ebbd34]/20 text-[#ebbd34]' : 'text-[#ebbd34]'}`}
              onClick={() => selectedBubbleId && handleReflect(selectedBubbleId)}
              disabled={hasReflected}
              title={hasReflected ? "Already reflected" : "Reflect this bubble"}
            >
              <Sparkles className="h-5 w-5" />
            </Button>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-center text-[#ebbd34]/50">
                  No messages yet. Start the conversation!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.user_id === user?.id
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        message.user_id === user?.id
                          ? "bg-[#ebbd34] text-white"
                          : "bg-white text-[#ebbd34]"
                      }`}
                    >
                      <div className="mb-1 text-xs opacity-70">
                        {message.username}
                      </div>
                      <div>{message.content}</div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <form
            onSubmit={handleSendMessage}
            className="flex items-center gap-2 border-t border-[#ebbd34]/10 bg-white p-4"
          >
            <Input
              placeholder={
                user
                  ? "Type your message..."
                  : "Sign in to join the conversation"
              }
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={!user}
              className="border-[#ebbd34]/20 focus-visible:ring-[#ebbd34]/20"
            />
            <Button
              type="submit"
              disabled={!user || !newMessage.trim()}
              className="bg-[#ebbd34] text-white hover:bg-[#ebbd34]/90"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-[#ebbd34]">
              Create a New Bubble
            </DialogTitle>
            <DialogDescription className="text-[#ebbd34]/70">
              Start a new conversation bubble for others to join.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateBubble} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="bubble-name"
                className="text-sm font-medium text-[#ebbd34]"
              >
                Bubble Name
              </label>
              <Input
                id="bubble-name"
                placeholder="Give your bubble a catchy name"
                value={newBubbleName}
                onChange={(e) => setNewBubbleName(e.target.value)}
                required
                className="border-[#ebbd34]/20 focus-visible:ring-[#ebbd34]/20"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="bubble-description"
                className="text-sm font-medium text-[#ebbd34]"
              >
                Description (Optional)
              </label>
              <Textarea
                id="bubble-description"
                placeholder="What's this bubble about?"
                value={newBubbleDescription}
                onChange={(e) => setNewBubbleDescription(e.target.value)}
                className="border-[#ebbd34]/20 focus-visible:ring-[#ebbd34]/20"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="border-[#ebbd34]/20 text-[#ebbd34] hover:bg-[#ebbd34]/10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#ebbd34] text-white hover:bg-[#ebbd34]/90"
                disabled={!newBubbleName.trim()}
              >
                Create Bubble
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
