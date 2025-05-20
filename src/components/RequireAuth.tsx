
import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface RequireAuthProps {
  children: ReactNode;
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const [showLoader, setShowLoader] = useState(true);

  // Only show the loader after 500ms of loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoader(isLoading);
    }, 500);

    return () => clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading && !user) {
      toast({
        title: "Authentication required",
        description: "Please log in to access this page",
        variant: "destructive",
      });
    }
  }, [isLoading, user, toast]);

  // Show nice loading state
  if (showLoader) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC]">
        <div className="text-center">
          <Loader2 className="w-16 h-16 mx-auto text-[#ebbd34] animate-spin" />
          <p className="mt-4 text-lg text-[#ebbd34]">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login page
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
