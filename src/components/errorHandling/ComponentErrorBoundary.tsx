
import React from "react";
import ErrorBoundary from "./ErrorBoundary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ComponentErrorBoundaryProps {
  children: React.ReactNode;
  name: string;
  fallbackUI?: React.ReactNode;
}

export default function ComponentErrorBoundary({ 
  children, 
  name,
  fallbackUI 
}: ComponentErrorBoundaryProps) {
  const defaultFallback = (
    <Alert variant="destructive" className="my-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error in {name}</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <p>This component encountered an error. You can try to:</p>
        <Button 
          variant="outline" 
          className="w-fit" 
          onClick={() => window.location.reload()}
        >
          Reload the page
        </Button>
      </AlertDescription>
    </Alert>
  );

  return (
    <ErrorBoundary fallback={fallbackUI || defaultFallback}>
      {children}
    </ErrorBoundary>
  );
}
