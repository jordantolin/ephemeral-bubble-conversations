
import React from "react";
import { useBubbleCreation, AVAILABLE_TOPICS } from "@/hooks/useBubbleCreation";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Loader2 } from "lucide-react";

interface CreateBubbleFormProps {
  onSuccess: () => void;
}

const CreateBubbleForm: React.FC<CreateBubbleFormProps> = ({ onSuccess }) => {
  const {
    form,
    isSubmitting,
    onSubmit,
    isGettingLocation,
    locationError,
    hasLocation,
    locationName,
    availableTopics
  } = useBubbleCreation(onSuccess);

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bubble Name</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter a name for your bubble" 
                  {...field} 
                  disabled={isSubmitting}
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
              <FormLabel>Topic</FormLabel>
              <Select
                disabled={isSubmitting}
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a topic" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableTopics.map((topic) => (
                    <SelectItem key={topic} value={topic}>
                      {topic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add a description for your bubble"
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Location indicator */}
        <div className="bg-secondary/20 p-3 rounded-md">
          <div className="flex items-center gap-2 text-sm">
            {isGettingLocation ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#ebbd34]" />
                <span>Detecting your location...</span>
              </>
            ) : locationError ? (
              <>
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{locationError}</span>
              </>
            ) : hasLocation ? (
              <>
                <MapPin className="h-4 w-4 text-[#ebbd34]" />
                <span>Your bubble will appear near {locationName || "your location"}</span>
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Location not available</span>
              </>
            )}
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Bubble...
            </>
          ) : (
            "Create Bubble"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default CreateBubbleForm;
