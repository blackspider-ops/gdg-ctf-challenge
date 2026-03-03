import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function makeAdmin() {
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    console.error('Not logged in or error getting user:', authError)
    console.log('\nPlease log in to the app first, then run this script.')
    return
  }

  console.log('Current user:', user.email)

  // Update user to admin
  const { data, error } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', user.id)
    .select()

  if (error) {
    console.error('Error making user admin:', error)
    return
  }

  console.log('✅ Successfully made user admin!')
  console.log('Updated profile:', data)

  // Verify is_admin() function works
  const { data: adminCheck, error: checkError } = await supabase.rpc('is_admin')
  
  if (checkError) {
    console.error('Error checking admin status:', checkError)
  } else {
    console.log('is_admin() returns:', adminCheck)
  }
}

makeAdmin()
