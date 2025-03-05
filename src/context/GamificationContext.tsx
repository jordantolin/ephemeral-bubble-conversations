
import { createContext, useContext, ReactNode } from 'react';
import { useGamification } from '@/hooks/useGamification';

// Create a context for gamification data
const GamificationContext = createContext<ReturnType<typeof useGamification> | undefined>(undefined);

// Provider component to wrap the app and provide gamification data
export function GamificationProvider({ children }: { children: ReactNode }) {
  const gamificationData = useGamification();
  
  return (
    <GamificationContext.Provider value={gamificationData}>
      {children}
    </GamificationContext.Provider>
  );
}

// Hook to consume the gamification context
export function useGamificationContext() {
  const context = useContext(GamificationContext);
  
  if (context === undefined) {
    throw new Error('useGamificationContext must be used within a GamificationProvider');
  }
  
  return context;
}
