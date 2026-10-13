import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './lib/supabase.types';

export const supabase: SupabaseClient<Database>;
