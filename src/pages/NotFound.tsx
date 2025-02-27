
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC] p-4 text-center">
      <img
        src="/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png"
        alt="Bubble Trouble"
        className="h-24 w-24"
      />
      
      <h1 className="mt-8 text-4xl font-bold text-[#ebbd34]">404</h1>
      <p className="mt-2 text-2xl font-medium text-[#ebbd34]/80">Page Not Found</p>
      
      <p className="mt-4 max-w-md text-[#ebbd34]/70">
        The page you're looking for doesn't exist or has been moved to another URL.
      </p>
      
      <Button asChild className="mt-8 bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white">
        <Link to="/" className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </Button>
    </div>
  );
}
