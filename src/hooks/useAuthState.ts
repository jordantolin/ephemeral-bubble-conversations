
import { useState } from 'react';
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
