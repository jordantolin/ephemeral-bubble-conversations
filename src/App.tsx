
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Outlet } from "react-router-dom";

const App = () => {
  return (
    <TooltipProvider>
      <Outlet />
      <Toaster />
      <Sonner />
    </TooltipProvider>
  );
};

export default App;
