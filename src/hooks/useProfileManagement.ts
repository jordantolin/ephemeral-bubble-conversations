
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
        // Make sure data conforms to the Profile interface
        const profileData: Profile = {
          ...data,
          // Ensure all required Profile properties are present
          id: data.id,
          username: data.username,
          display_name: data.username || 'User', // Use username as fallback for display_name
          avatar_url: data.avatar_url,
          created_at: data.created_at,
          updated_at: data.updated_at,
          daily_streak: data.daily_streak || 0,
          experience: data.experience || 0,
          level: data.level || 1,
          total_points: data.total_points || 0,
          last_streak_date: data.last_streak_date
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
