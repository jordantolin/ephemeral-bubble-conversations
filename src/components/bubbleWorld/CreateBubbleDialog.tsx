
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MapPin, AlertTriangle } from "lucide-react";
import { useBubbleCreation } from "@/hooks/useBubbleCreation";

interface CreateBubbleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateBubbleDialog = ({ open, onOpenChange }: CreateBubbleDialogProps) => {
  const { 
    form, 
    isSubmitting, 
    onSubmit, 
    isGettingLocation, 
    locationError, 
    hasLocation,
    locationName
  } = useBubbleCreation(() => {
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#ebbd34]">Create a New Bubble</DialogTitle>
          <DialogDescription>
            Create a conversation bubble about any topic. It will last for 24 hours.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#ebbd34]">Bubble Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Give your bubble a name" 
                      {...field} 
                      className="border-[#ebbd34]/20 focus-visible:ring-[#ebbd34]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#ebbd34]">Topic</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="What is this bubble about?" 
                      {...field} 
                      className="border-[#ebbd34]/20 focus-visible:ring-[#ebbd34]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#ebbd34]">Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add more details about your bubble" 
                      {...field} 
                      className="resize-none border-[#ebbd34]/20 focus-visible:ring-[#ebbd34]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location Information */}
            <div className="bg-muted/30 p-3 rounded-md">
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-[#ebbd34] shrink-0 mt-0.5" />
                <div className="space-y-1 text-sm">
                  {isGettingLocation ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-[#ebbd34]" />
                      <span>Getting your location...</span>
                    </div>
                  ) : locationError ? (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{locationError}</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="font-medium">Bubble Location</p>
                      <p className="text-muted-foreground">
                        {locationName || "Location found"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Your bubble will appear on the 3D world at this location
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {isSubmitting ? "Creating..." : "Create Bubble"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateBubbleDialog;
