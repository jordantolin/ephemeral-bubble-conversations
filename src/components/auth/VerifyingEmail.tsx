
import { Loader2 } from "lucide-react";

export function VerifyingEmail() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-[#FEF7E4] to-[#FFF9EC] p-4">
      <div className="text-center">
        <img 
          src="/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png"
          alt="Bubble Trouble" 
          className="w-16 h-16 mx-auto mb-4"
        />
        <h1 className="text-xl font-bold text-[#ebbd34] mb-4">Verifying your email...</h1>
        <Loader2 className="h-8 w-8 animate-spin text-[#ebbd34] mx-auto" />
      </div>
    </div>
  );
}
