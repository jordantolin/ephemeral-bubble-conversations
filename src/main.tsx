
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import App from './App';
import Index from './pages/Index';
import Feed from './pages/Feed';
import MyBubbles from './pages/MyBubbles';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import { UserProvider } from './context/UserContext';
import NotFound from './pages/NotFound';
import './index.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />}>
              <Route index element={<Index />} />
              <Route path="feed" element={<Feed />} />
              <Route path="my-bubbles" element={<MyBubbles />} />
              <Route path="profile" element={<Profile />} />
              <Route path="auth" element={<Auth />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
          <Toaster />
        </BrowserRouter>
      </UserProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
