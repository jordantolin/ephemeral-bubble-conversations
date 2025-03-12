
import React from 'react';
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import Index from "@/pages/Index";
import Profile from "@/pages/Profile";
import BubbleChat from "@/pages/BubbleChat";
import NotFound from "@/pages/NotFound";
import Legal from "@/pages/Legal";
import AuthWrapper from "@/components/AuthWrapper";
import HeartfeltConnectionsPage from '@/pages/HeartfeltConnectionsPage';

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <AuthWrapper>
        <Index />
      </AuthWrapper>
    ),
  },
  {
    path: "/profile/:id",
    element: (
      <AuthWrapper>
        <Profile />
      </AuthWrapper>
    ),
  },
  {
    path: "/bubble-chat/:id",
    element: (
      <AuthWrapper>
        <BubbleChat />
      </AuthWrapper>
    ),
  },
  {
    path: "/legal",
    element: <Legal />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
  {
    path: "/heartfelt",
    element: (
      <HeartfeltConnectionsPage />
    ),
  },
]);

function App() {
  return (
    <RouterProvider router={router} />
  );
}

export default App;
