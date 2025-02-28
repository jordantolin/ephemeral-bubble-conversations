
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Index from "@/pages/Index";
import Feed from "@/pages/Feed";
import MyBubbles from "@/pages/MyBubbles";
import BubbleChat from "@/pages/BubbleChat";
import Profile from "@/pages/Profile";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";
import RequireAuth from "@/components/RequireAuth";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";

function App() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  // Add global style to ensure consistent background color
  useEffect(() => {
    // Create a style element
    const styleElement = document.createElement('style');
    
    // Set its content to include our global styles
    styleElement.textContent = `
      body {
        background-color: #FEF7E4 !important;
        margin: 0;
        padding: 0;
      }
      
      #root {
        background-color: #FEF7E4 !important;
        min-height: 100vh;
        width: 100%;
      }
    `;
    
    // Add it to the document head
    document.head.appendChild(styleElement);
    
    // Clean up function
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Log to help with debugging
  console.log("App component rendering");

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="min-h-screen bg-[#FEF7E4] w-full">
          <Router>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/bubbles/:id" element={<BubbleChat />} />
              <Route path="/bubble-chat/:id" element={<BubbleChat />} />
              <Route path="/my-bubbles" element={<RequireAuth><MyBubbles /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
              <Route path="/auth/*" element={<Auth />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
          <Toaster />
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
