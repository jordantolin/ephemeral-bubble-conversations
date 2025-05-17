
// Define the User type
export type User = {
  id: string;
  email: string;
};

// Define the Auth context type
export type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any } | undefined>;
  signUp: (email: string, password: string) => Promise<{ error: any } | undefined>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error: any } | undefined>;
  verifyOTP: (email: string, token: string, type: 'email' | 'recovery') => Promise<{ error: any } | undefined>;
  confirmPasswordReset: (password: string) => Promise<{ error: any } | undefined>;
  updatePassword: (password: string) => Promise<{ error: any } | undefined>;
  resendVerificationEmail: (email: string) => Promise<{ error: any } | undefined>;
};

// Import the Profile type
import { Profile } from './profile';
