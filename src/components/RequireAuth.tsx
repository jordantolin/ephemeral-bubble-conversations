
import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface RequireAuthProps {
  children: ReactNode;
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const { toast } = useToast();

  // Only show toast when loading is complete and user is not authenticated
  useEffect(() => {
    let timeoutId: number | null = null;
    
    if (!isLoading && !user) {
      // Small delay to prevent flashing toast on initial load
      timeoutId = window.setTimeout(() => {
        toast({
          title: "Authentication required",
          description: "Please log in to access this page",
          variant: "destructive",
        });
      }, 500);
    }
    
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [isLoading, user, toast]);

  // Simple loading state with timeout to prevent infinite loading
  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto border-4 border-[#ebbd34] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-lg text-[#ebbd34]">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to auth page
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If authenticated, render children
  return <>{children}</>;
}
