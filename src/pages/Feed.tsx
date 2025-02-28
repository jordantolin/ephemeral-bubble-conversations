
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle, MessageSquare, ThumbsUp, Send, Sparkles, ChevronRight, ChevronLeft, ClockIcon, RefreshCw } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRateLimiter, createRetryHandler } from "@/utils/bubbleUtils";

const Feed = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [comment, setComment] = useState("");
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const pageSize = 5;
  
  const [isSendingComment, setIsSendingComment] = useState(false);
  const commentLimiter = useState(createRateLimiter(5, 10000))[0];
  const sendRetry = useState(createRetryHandler(3, 1000))[0];

  const { data: activityFeed = [], isLoading, error, refetch } = useQuery({
    queryKey: ['feed', currentPage],
    queryFn: async () => {
      try {
        // Calculate pagination offset
        const offset = (currentPage - 1) * pageSize;
        
        // Get recent activities
        const { data: activities, error, count } = await supabase
          .from('bubble_activities')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1);
          
        if (error) {
          throw error;
        }
        
        // Update total pages
        if (count !== null) {
          setTotalPages(Math.max(1, Math.ceil(count / pageSize)));
        }
        
        // Fetch related bubbles for activities
        const bubbleIds = activities
          ?.map(activity => activity.bubble_id)
          .filter((id, index, array) => array.indexOf(id) === index) || [];
          
        if (bubbleIds.length === 0) {
          return activities || [];
        }
        
        const { data: bubbles, error: bubblesError } = await supabase
          .from('bubbles')
          .select('*')
          .in('id', bubbleIds);
          
        if (bubblesError) {
          console.error("Error fetching related bubbles:", bubblesError);
          return activities || [];
        }
        
        // Combine activities with related bubble data
        return (activities || []).map(activity => {
          const relatedBubble = bubbles?.find(b => b.id === activity.bubble_id);
          return {
            ...activity,
            bubble: relatedBubble || null
          };
        });
      } catch (error) {
        console.error("Error fetching feed:", error);
        toast({
          title: "Error loading feed",
          description: "Could not load the activity feed",
          variant: "destructive"
        });
        return [];
      }
    },
    staleTime: 60000,
    refetchInterval: 300000
  });

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['comments', selectedBubbleId],
    queryFn: async () => {
      if (!selectedBubbleId) return [];
      
      try {
        const { data, error } = await supabase
          .from('bubble_comments')
          .select('*')
          .eq('bubble_id', selectedBubbleId)
          .order('created_at', { ascending: true });
          
        if (error) {
          throw error;
        }
        
        return data || [];
      } catch (error) {
        console.error("Error fetching comments:", error);
        toast({
          title: "Error loading comments",
          description: "Could not load comments for this bubble",
          variant: "destructive"
        });
        return [];
      }
    },
    enabled: !!selectedBubbleId,
    staleTime: 30000
  });

  const refreshFeed = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['feed'] });
    toast({
      title: "Feed refreshed",
      description: "Latest activities loaded"
    });
  };

  const goToPage = (page: number) => {
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    setCurrentPage(page);
  };

  const sendComment = async () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please sign in to comment",
        variant: "destructive"
      });
      return;
    }
    
    if (!selectedBubbleId || !comment.trim()) {
      return;
    }
    
    // Check rate limiting
    if (!commentLimiter.canMakeRequest()) {
      const waitTime = commentLimiter.getWaitTime();
      toast({
        title: "Please wait",
        description: `You can send another comment in ${Math.ceil(waitTime / 1000)} seconds`,
        variant: "destructive"
      });
      return;
    }
    
    setIsSendingComment(true);
    
    try {
      // Save the comment text before clearing the input
      const commentText = comment.trim();
      setComment("");
      
      await sendRetry(async () => {
        const { error } = await supabase
          .from('bubble_comments')
          .insert({
            bubble_id: selectedBubbleId,
            username: profile?.username || user.email || 'anonymous',
            content: commentText
          });
          
        if (error) throw error;
      });
      
      // Refresh comments
      refetchComments();
      
      toast({
        title: "Comment added",
        description: "Your comment was posted successfully"
      });
    } catch (error) {
      console.error("Error sending comment:", error);
      toast({
        title: "Error sending comment",
        description: "Failed to post your comment",
        variant: "destructive"
      });
      // Put back the comment
      setComment(comment);
    } finally {
      setIsSendingComment(false);
    }
  };

  const joinChat = (bubbleId: string) => {
    if (!bubbleId) return;
    
    // Navigate to chat page
    navigate(`/bubble-chat/${bubbleId}`);
  };

  // Format function for timestamps
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (diffInSeconds < 60) return "just now";
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
      if (diffInSeconds < 172800) return "yesterday";
      
      // Format the date for older posts
      return new Intl.DateTimeFormat('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      }).format(date);
    } catch (error) {
      return "unknown time";
    }
  };

  const renderActivityContent = (activity: any) => {
    const activityType = activity.activity_type;
    const username = activity.username;
    const content = activity.content;
    const bubbleName = activity.bubble?.name || "Unknown bubble";
    
    switch (activityType) {
      case 'new_bubble':
        return (
          <>
            <p className="mb-2 text-sm text-gray-600"><strong>{username}</strong> created a new bubble:</p>
            <div className="bg-[#ebbd34]/5 p-3 rounded-lg">
              <h4 className="font-medium text-lg text-[#ebbd34]">{bubbleName}</h4>
              {activity.bubble?.description && (
                <p className="text-gray-600 mt-1">{activity.bubble.description}</p>
              )}
              <div className="mt-3 flex items-center justify-between">
                <Badge variant="outline" className="text-[#ebbd34] border-[#ebbd34]/20">
                  {activity.bubble?.topic || "general"}
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-[#ebbd34] border-[#ebbd34]/20"
                  onClick={() => joinChat(activity.bubble_id)}
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Join Chat
                </Button>
              </div>
            </div>
          </>
        );
        
      case 'new_message':
        return (
          <>
            <p className="mb-2 text-sm text-gray-600"><strong>{username}</strong> sent a message in:</p>
            <div className="bg-[#ebbd34]/5 p-3 rounded-lg">
              <h4 className="font-medium text-[#ebbd34]">{bubbleName}</h4>
              <div className="bg-white/80 p-2 rounded mt-2 text-gray-800">
                <p className="italic">"{content}"</p>
              </div>
              <div className="mt-3 flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-[#ebbd34] border-[#ebbd34]/20"
                  onClick={() => joinChat(activity.bubble_id)}
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Join Chat
                </Button>
              </div>
            </div>
          </>
        );
        
      case 'reflect':
        return (
          <>
            <p className="mb-2 text-sm text-gray-600"><strong>{username}</strong> reflected on:</p>
            <div className="bg-[#ebbd34]/5 p-3 rounded-lg">
              <h4 className="font-medium text-[#ebbd34]">{bubbleName}</h4>
              <div className="mt-3 flex justify-between items-center">
                <Badge variant="outline" className="text-[#ebbd34] border-[#ebbd34]/20">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {activity.bubble?.reflect_count || 0} reflects
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-[#ebbd34] border-[#ebbd34]/20"
                  onClick={() => joinChat(activity.bubble_id)}
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Join Chat
                </Button>
              </div>
            </div>
          </>
        );
        
      default:
        return (
          <div className="bg-[#ebbd34]/5 p-3 rounded-lg">
            <h4 className="font-medium text-[#ebbd34]">{bubbleName}</h4>
            <p className="text-gray-600 mt-1">Activity by {username}</p>
            <div className="mt-3 flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-[#ebbd34] border-[#ebbd34]/20"
                onClick={() => joinChat(activity.bubble_id)}
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                Join Chat
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-secondary/20">
      <div className="container mx-auto px-4 py-24 max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[#ebbd34]">Recent Activity</h1>
            <p className="text-gray-600 mt-2">See what's happening across all bubbles</p>
          </div>
          <Button 
            variant="outline" 
            className="text-[#ebbd34] border-[#ebbd34]/20 hover:bg-[#ebbd34]/5"
            onClick={refreshFeed}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#ebbd34] border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading activity feed...</p>
          </div>
        ) : error ? (
          <Card className="mb-6 border-red-200">
            <CardContent className="pt-6 text-center">
              <p className="text-red-600 mb-3">Error loading feed</p>
              <Button 
                variant="outline"
                onClick={() => refetch()}
                className="border-[#ebbd34]/20 text-[#ebbd34]"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : activityFeed.length === 0 ? (
          <Card className="mb-6">
            <CardContent className="pt-6 text-center">
              <p className="text-gray-600 mb-2">No recent activity found</p>
              <p className="text-gray-500 text-sm mb-4">Create or join bubbles to see activity here</p>
              <Button 
                onClick={() => navigate('/')}
                className="bg-[#ebbd34] hover:bg-[#ebbd34]/90"
              >
                Explore Bubbles
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {activityFeed.map((activity: any, index: number) => (
              <Card key={activity.id || index} className="mb-6 overflow-hidden">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-[#ebbd34]/10 text-[#ebbd34]">
                        {activity.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="w-full">
                        {renderActivityContent(activity)}
                      </div>
                      
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(activity.created_at)}
                        </span>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-500 hover:text-[#ebbd34] hover:bg-[#ebbd34]/5 h-8"
                            onClick={() => {
                              setSelectedBubbleId(activity.bubble_id);
                              setCommentDialogOpen(true);
                            }}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Comment
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center mt-8 gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="border-[#ebbd34]/20 text-[#ebbd34]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <span className="text-sm px-3 py-2 rounded-md bg-[#ebbd34]/5 text-[#ebbd34]">
                  Page {currentPage} of {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="border-[#ebbd34]/20 text-[#ebbd34]"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Comments Dialog */}
      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
            <DialogDescription>
              Join the conversation about this bubble
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <ScrollArea className="h-[300px] rounded-md border p-4">
              {comments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No comments yet. Be the first to comment!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment: any) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-[#ebbd34]/10 text-[#ebbd34] text-xs">
                          {comment.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-gray-100 rounded-lg p-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-xs text-gray-700">{comment.username}</span>
                            <span className="text-xs text-gray-500">{formatTimestamp(comment.created_at)}</span>
                          </div>
                          <p className="text-sm text-gray-800">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            
            <Separator className="my-4" />
            
            <div className="flex flex-col gap-2">
              <Label htmlFor="comment">Your comment</Label>
              <div className="flex gap-2">
                <Textarea
                  id="comment"
                  placeholder="Write a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="flex-1"
                  disabled={isSendingComment}
                />
                <Button 
                  size="icon"
                  disabled={!comment.trim() || isSendingComment}
                  onClick={sendComment}
                  className="bg-[#ebbd34] hover:bg-[#ebbd34]/90"
                >
                  {isSendingComment ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button 
                variant="outline"
                onClick={() => joinChat(selectedBubbleId || "")}
                className="text-[#ebbd34] border-[#ebbd34]/20"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Join Chat
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Feed;
