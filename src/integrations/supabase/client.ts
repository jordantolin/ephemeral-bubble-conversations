
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fmsijphhzututcmzlhfr.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtc2lqcGhoenV0dXRjbXpsaGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTcwMzUyMDksImV4cCI6MjAzMjYxMTIwOX0.cUWSGPZIOQJxk0w8I29XZgb7UKR3IUnYrxL-_1J6Ydg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
