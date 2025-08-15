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
  isValidUrl(envUrl) && 
  envUrl !== 'your_supabase_project_url' &&
  envKey !== 'your_supabase_anon_key'
)

// Use actual values since we have valid credentials now
const supabaseUrl = hasValidConfig ? envUrl : 'https://ijjdclfibcjvnpxfcglc.supabase.co'
const supabaseAnonKey = hasValidConfig ? envKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqamRjbGZpYmNqdm5weGZjZ2xjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyMjc5NTUsImV4cCI6MjA3MDgwMzk1NX0.yEih-35kEPIzR1kFJsr2ugaxnEPMAOqi3OQWn8yoPzg'

if (!hasValidConfig) {
  console.warn('⚠️ Supabase credentials not configured properly!')
  console.warn('The app is running in demo mode. Authentication will not work.')
  
  if (envUrl === 'your_supabase_project_url' || envKey === 'your_supabase_anon_key') {
    console.warn('📝 You need to replace the placeholder values in .env.local with your actual Supabase credentials.')
  }
  
  console.warn('To enable authentication:')
  console.warn('1. Create a Supabase project at https://supabase.com')
  console.warn('2. Update .env.local with your actual credentials:')
  console.warn('   REACT_APP_SUPABASE_URL=https://your-project.supabase.co')
  console.warn('   REACT_APP_SUPABASE_ANON_KEY=your_actual_anon_key')
  console.warn('3. Restart the development server')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const isSupabaseConfigured: boolean = hasValidConfig