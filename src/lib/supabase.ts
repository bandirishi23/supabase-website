import { createClient } from '@supabase/supabase-js'

// Get environment variables
const envUrl = process.env.REACT_APP_SUPABASE_URL || ''
const envKey = process.env.REACT_APP_SUPABASE_ANON_KEY || ''

// Check if the URL is valid
const isValidUrl = (url: string) => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Check if we have valid configuration
const hasValidConfig: boolean = !!(
  envUrl && 
  envKey && 
  isValidUrl(envUrl)
)

// Use environment variables only
const supabaseUrl = envUrl
const supabaseAnonKey = envKey

if (!hasValidConfig) {
  console.warn('⚠️ Supabase credentials not configured properly!')
  console.warn('Authentication will not work without valid credentials.')
  
  if (!envUrl || !envKey) {
    console.warn('📝 Missing environment variables in .env file:')
    console.warn('   REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are required')
  }
  
  console.warn('To enable authentication:')
  console.warn('1. Create a Supabase project at https://supabase.com')
  console.warn('2. Update .env with your actual credentials:')
  console.warn('   REACT_APP_SUPABASE_URL=https://your-project.supabase.co')
  console.warn('   REACT_APP_SUPABASE_ANON_KEY=your_actual_anon_key')
  console.warn('3. Restart the development server')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const isSupabaseConfigured: boolean = hasValidConfig