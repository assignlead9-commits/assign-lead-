import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'essential_soul_supabase_url';
const STORAGE_KEY_KEY = 'essential_soul_supabase_anon_key';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isCustom: boolean;
  isConnected: boolean;
}

export function getStoredSupabaseConfig(): { url: string; anonKey: string; isCustom: boolean } {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  const storedUrl = localStorage.getItem(STORAGE_KEY_URL);
  const storedKey = localStorage.getItem(STORAGE_KEY_KEY);

  if (storedUrl && storedKey) {
    return { url: storedUrl, anonKey: storedKey, isCustom: true };
  }

  return { url: envUrl, anonKey: envKey, isCustom: false };
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  localStorage.setItem(STORAGE_KEY_URL, url.trim());
  localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
  // Reload client
  initSupabaseClient();
}

export function clearSupabaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_KEY);
  initSupabaseClient();
}

let supabaseInstance: SupabaseClient | null = null;
let isConnectedCache: boolean = false;

export function initSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getStoredSupabaseConfig();
  if (url && anonKey && url.startsWith('http')) {
    try {
      supabaseInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      return supabaseInstance;
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      supabaseInstance = null;
      return null;
    }
  }
  supabaseInstance = null;
  return null;
}

// Initial initialization
initSupabaseClient();

export function getSupabase(): SupabaseClient | null {
  return supabaseInstance;
}

export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  const client = getSupabase();
  if (!client) {
    return {
      success: false,
      message: 'No Supabase URL or Anon Key configured. Currently using high-speed persistent store.',
    };
  }

  try {
    const { error } = await client.from('departments').select('count', { count: 'exact', head: true });
    if (error) {
      if (error.code === '42P01') {
        return {
          success: false,
          message: 'Connected to Supabase, but tables are not yet created! Please run the SQL schema in your Supabase SQL Editor.',
        };
      }
      return {
        success: false,
        message: `Supabase query error: ${error.message}`,
      };
    }
    isConnectedCache = true;
    return {
      success: true,
      message: 'Successfully connected to live Supabase database!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Connection failed: ${err.message || 'Network error'}`,
    };
  }
}
