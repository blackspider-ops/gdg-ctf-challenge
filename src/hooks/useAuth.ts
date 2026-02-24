import { useState, useEffect } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { useFallbackAuth } from './useFallbackAuth'
import { useEmergencyAdmin } from './useEmergencyAdmin'

// Define types
interface Profile {
  id: string
  full_name: string
  email: string
  role: 'player' | 'admin' | 'owner'
  created_at: string
  updated_at: string
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const { fallbackUser, logoutFallback } = useFallbackAuth()
  const { checkEmergencySession, logoutEmergencyAdmin } = useEmergencyAdmin()

  // Function to refresh auth state (for when emergency/fallback sessions are created)
  const refreshAuth = async () => {
    const emergencyAdmin = checkEmergencySession()
    
    if (emergencyAdmin) {
      setProfile(emergencyAdmin)
      setUser(null)
      setSession(null)
      setLoading(false)
      return
    }

    if (fallbackUser) {
      setProfile(fallbackUser)
      setLoading(false)
      return
    }

    // If no fallback sessions, check normal auth
    try {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
    } catch (error) {
      console.error('Auth refresh error:', error)
      setProfile(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    let mounted = true

    // Initialize auth state
    const initializeAuth = async () => {
        try {
        // Check for emergency admin session first
        const emergencyAdmin = checkEmergencySession()
        if (emergencyAdmin && mounted) {
          setProfile(emergencyAdmin)
          setUser(null)
          setSession(null)
          setLoading(false)
          return
        }

        // Check for fallback user session
        if (fallbackUser && mounted) {
          setProfile(fallbackUser)
          setLoading(false)
          return
        }

        // Normal Supabase auth
        const { data: { session } } = await supabase.auth.getSession()
        if (!mounted) return

        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          // Don't clear profile if it's an emergency/fallback session
          const emergencyAdmin = checkEmergencySession()
          if (!emergencyAdmin && !fallbackUser) {
            setProfile(null)
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        // Check fallback auth on Supabase error
        const emergencyAdmin = checkEmergencySession()
        if (emergencyAdmin && mounted) {
          setProfile(emergencyAdmin)
        } else if (fallbackUser && mounted) {
          setProfile(fallbackUser)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      setSession(session)
      setUser(session?.user ?? null)
      
      // Handle profile fetching without blocking the callback
      if (session?.user) {
        setTimeout(() => fetchProfile(session.user!.id), 0)
      } else {
        // Don't clear profile if we have emergency/fallback session
        const emergencyAdmin = checkEmergencySession()
        if (!emergencyAdmin && !fallbackUser) {
          setProfile(null)
        }
      }
      
      if (mounted) setLoading(false)

      // Clean up auth params from URL after successful sign-in
      if (event === 'SIGNED_IN' && typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        if (url.hash.includes('access_token') || url.hash.includes('error')) {
          window.history.replaceState({}, document.title, url.origin + url.pathname)
        }
      }
    })

    initializeAuth()

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Watch for changes in fallback/emergency sessions
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'emergency_admin' || e.key === 'fallback_user') {
        refreshAuth()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Also watch for changes in fallbackUser prop and emergency sessions
  useEffect(() => {
    // Check for emergency session
    const emergencyAdmin = checkEmergencySession()
    if (emergencyAdmin && (!profile || profile.id !== emergencyAdmin.id)) {
      setProfile(emergencyAdmin)
      setUser(null)
      setSession(null)
      setLoading(false)
      return
    }
    
    // Check for fallback user
    if (fallbackUser && (!profile || profile.id !== fallbackUser.id)) {
      console.log('Setting fallback user as profile:', fallbackUser)
      setProfile(fallbackUser)
      setLoading(false)
    }
  }, [fallbackUser])

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        console.error('Profile fetch error:', error)
        return
      }

      if (data) {
        setProfile(data as any)
      } else {
        // Profile doesn't exist - this is normal for unverified users
        setProfile(null)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const signOut = async () => {
    // Check if using fallback auth
    const emergencyAdmin = checkEmergencySession()
    if (emergencyAdmin) {
      // Clear emergency admin session completely
      logoutEmergencyAdmin()
      localStorage.removeItem('emergency_admin')
      setProfile(null)
      setUser(null)
      setSession(null)
      setLoading(false)
      
      // Try to close the window, if that fails, redirect and show message
      const closed = window.close()
      
      // If window.close() doesn't work (most browsers), redirect with a message
      setTimeout(() => {
        alert('Emergency admin session ended. Please close this tab manually.')
        window.location.href = '/'
      }, 100)
      return
    }

    if (fallbackUser) {
      logoutFallback()
      localStorage.removeItem('fallback_user')
      setProfile(null)
      setUser(null)
      setSession(null)
      return
    }

    // Normal Supabase signout
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
    }
  }



  return {
    user,
    profile,
    session,
    loading,
    signOut,
    refreshAuth,
    isAdmin: profile?.role === 'admin' || profile?.role === 'owner',
    isOwner: profile?.role === 'owner'
  }
}