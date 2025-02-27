
import { createClient } from '@supabase/supabase-js';

// Use the original token that was in the client.ts file
const supabaseUrl = 'https://fmsijphhzututcmzlhfr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtc2lqcGhoenV0dXRjbXpsaGZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk4NjE1NzYsImV4cCI6MjA1NTQzNzU3Nn0.e6MyIJ2j5ehDnnI-jAGY5toj7m6nqMVjAfpiHeOpN_o';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
