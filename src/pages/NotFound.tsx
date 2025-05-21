
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FEF7E4]">
      <div className="text-center p-8 max-w-md bg-white rounded-2xl shadow-lg">
        <div className="flex justify-center mb-6">
          <img 
            src="/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png"
            alt="Bubble Trouble" 
            className="w-20 h-20"
          />
        </div>
        <h1 className="text-4xl font-bold mb-2 text-[#ebbd34]">404</h1>
        <p className="text-xl text-gray-600 mb-6">Oops! This bubble has popped</p>
        <p className="text-gray-500 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <Button
          asChild
          className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white"
        >
          <Link to="/">Return to Home</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
