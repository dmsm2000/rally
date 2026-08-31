import { createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

/** Single shared Supabase client for the whole app (auth session + future DB/storage calls). */
export const supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
