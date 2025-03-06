
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { AlertTriangle, Home } from "lucide-react";
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
          <AlertTriangle className="h-16 w-16 text-[#ebbd34]" />
        </div>
        <h1 className="text-4xl font-bold mb-2 text-[#ebbd34]">404</h1>
        <p className="text-xl text-gray-600 mb-6">Oops! This page is missing</p>
        <p className="text-gray-500 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            asChild
            className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white"
          >
            <Link to="/">
              <Home className="h-4 w-4 mr-2" />
              Return to Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
