/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://xshsxwbfqzkdukdsxgry.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzaHN4d2JmcXprZHVrZHN4Z3J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODAxOTUsImV4cCI6MjA4ODU1NjE5NX0.2YQoXe1ehGXdtH2hUj3xOXqwvpxNfAcA6Dd6o1uGCJA";

// Export a flag to check if Supabase is configured
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : new Proxy({} as any, {
      get: (target, prop) => {
        if (prop === 'auth') {
          return new Proxy({} as any, {
            get: () => () => ({ data: { session: null, subscription: { unsubscribe: () => {} } }, error: null })
          });
        }
        return () => Promise.resolve({ data: null, error: new Error("Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.") });
      }
    });
