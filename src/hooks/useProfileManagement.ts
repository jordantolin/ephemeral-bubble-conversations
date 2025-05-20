
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/profile';
import { useToast } from '@/hooks/use-toast';

/**
 * Custom hook for profile management operations
 */
export const useProfileManagement = (setProfile: (profile: Profile | null) => void) => {
  const { toast } = useToast();

  // Function to fetch user profile
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Record not found - create a new profile
          console.info('Profile not found, may need to create one');
          setProfile(null);
        } else {
          console.error('Error fetching profile:', error);
          toast({
            title: 'Error fetching profile',
            description: 'Please try again later',
            variant: 'destructive'
          });
        }
        return;
      }

      if (data) {
        // Make sure data conforms to the Profile interface by adding display_name if missing
        const profileData: Profile = {
          ...data,
          display_name: data.display_name || data.username || 'User' // Provide fallbacks
        };
        setProfile(profileData);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      toast({
        title: 'Error connecting to database',
        description: 'Please check your connection and try again',
        variant: 'destructive'
      });
    }
  };

  return { fetchProfile };
};
