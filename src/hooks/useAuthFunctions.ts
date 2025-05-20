
import { useAuthState } from './useAuthState';
import { useProfileManagement } from './useProfileManagement';
import { useAuthOperations } from './useAuthOperations';
import { usePasswordRecovery } from './usePasswordRecovery';

/**
 * Combined hook that integrates all authentication functionality
 */
export const useAuthFunctions = () => {
  // Use the smaller, focused hooks
  const authState = useAuthState();
  const { fetchProfile } = useProfileManagement(authState.setProfile);
  const authOperations = useAuthOperations();
  const passwordRecovery = usePasswordRecovery();

  // Return all the auth functionality and state
  return {
    ...authState,
    fetchProfile,
    ...authOperations,
    ...passwordRecovery
  };
};
