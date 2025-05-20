
import { useState, useEffect } from 'react';
import { User } from '@/types/auth';
import { Profile } from '@/types/profile';

/**
 * Custom hook for managing authentication state
 */
export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [resetEmail, setResetEmail] = useState<string | null>(null);

  // Check localStorage for persisted auth state on mount
  useEffect(() => {
    try {
      const persistedUser = localStorage.getItem('auth_user');
      if (persistedUser) {
        setUser(JSON.parse(persistedUser));
      }
    } catch (error) {
      console.error('Error retrieving persisted auth state:', error);
      // Clear potentially corrupted storage
      localStorage.removeItem('auth_user');
    }
  }, []);

  // Persist user state to localStorage when it changes
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('auth_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('auth_user');
      }
    } catch (error) {
      console.error('Error persisting auth state:', error);
    }
  }, [user]);

  return {
    user,
    setUser,
    profile,
    setProfile,
    isLoading,
    setIsLoading,
    resetEmail,
    setResetEmail
  };
};
