import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        '[UmvaLearn] Supabase credentials not set. Auth and database features will be unavailable.\n' +
        'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
    )
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-anon-key',
    {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
        },
    }
)

const isPlaceholder = (value: string | undefined) =>
    !value || /placeholder|your-project|your-anon|example/i.test(value)

export const isSupabaseConfigured =
    !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseAnonKey)
