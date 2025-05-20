
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/profile';

/**
 * Custom hook for profile management operations
 */
export const useProfileManagement = (setProfile: (profile: Profile | null) => void) => {
  // Function to fetch user profile
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        // Make sure data conforms to the Profile interface by adding display_name if missing
        const profileData: Profile = {
          ...data,
          display_name: data.username // Use username as display_name if it's missing
        };
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };

  return { fetchProfile };
};
