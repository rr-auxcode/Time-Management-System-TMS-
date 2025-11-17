import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// Get these from your Supabase project settings: https://supabase.com/dashboard/project/_/settings/api
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials not found. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.\n' +
    'Get these from: https://supabase.com/dashboard/project/_/settings/api'
  );
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Database types (will be auto-generated later, but defining manually for now)
export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          start_date: string;
          end_date: string;
          status: 'active' | 'completed' | 'cancelled' | 'on-hold';
          color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          start_date: string;
          end_date: string;
          status?: 'active' | 'completed' | 'cancelled' | 'on-hold';
          color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          start_date?: string;
          end_date?: string;
          status?: 'active' | 'completed' | 'cancelled' | 'on-hold';
          color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          description: string | null;
          start_date: string;
          end_date: string;
          hours_spent: number;
          estimated_hours: number | null;
          status: 'not-started' | 'in-progress' | 'completed' | 'on-hold';
          assignee: string | null;
          color: string | null;
          dependencies: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          description?: string | null;
          start_date: string;
          end_date: string;
          hours_spent?: number;
          estimated_hours?: number | null;
          status?: 'not-started' | 'in-progress' | 'completed' | 'on-hold';
          assignee?: string | null;
          color?: string | null;
          dependencies?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          description?: string | null;
          start_date?: string;
          end_date?: string;
          hours_spent?: number;
          estimated_hours?: number | null;
          status?: 'not-started' | 'in-progress' | 'completed' | 'on-hold';
          assignee?: string | null;
          color?: string | null;
          dependencies?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

