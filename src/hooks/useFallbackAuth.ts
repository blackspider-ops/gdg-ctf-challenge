import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface FallbackAuthSettings {
  enabled: boolean
  accessCode: string
}

interface FallbackUser {
  id: string
  full_name: string
  email: string
  role: 'player' | 'admin'
  created_at: string
}

export const useFallbackAuth = () => {
  const [fallbackSettings, setFallbackSettings] = useState<FallbackAuthSettings>({
    enabled: false,
    accessCode: ''
  })
  const [fallbackUser, setFallbackUser] = useState<FallbackUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Generate a random 5-digit code
  const generateAccessCode = () => {
    return Math.floor(10000 + Math.random() * 90000).toString()
  }

  // Fetch fallback settings from database
  const fetchFallbackSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('event_settings')
        .select('key, value')
        .in('key', ['fallback_auth_enabled', 'fallback_access_code'])

      if (error) throw error

      const settings = data?.reduce((acc, setting) => {
        acc[setting.key] = setting.value
        return acc
      }, {} as Record<string, string>) || {}

      setFallbackSettings({
        enabled: settings.fallback_auth_enabled === 'true',
        accessCode: settings.fallback_access_code || generateAccessCode()
      })
    } catch (error) {
      console.error('Error fetching fallback settings:', error)
      // If Supabase fails, check localStorage for fallback settings
      const localSettings = localStorage.getItem('fallback_settings')
      if (localSettings) {
        try {
          const parsed = JSON.parse(localSettings)
          setFallbackSettings(parsed)
        } catch (parseError) {
          // If localStorage also fails, use default disabled state
          setFallbackSettings({
            enabled: false,
            accessCode: generateAccessCode()
          })
        }
      } else {
        // Default to disabled if no settings found
        setFallbackSettings({
          enabled: false,
          accessCode: generateAccessCode()
        })
      }
    } finally {
      setLoading(false)
    }
  }

  // Enable/disable fallback auth (admin only)
  const toggleFallbackAuth = async (enabled: boolean) => {
    try {
      const newCode = enabled ? generateAccessCode() : ''
      
      await supabase.from('event_settings').upsert([
        {
          key: 'fallback_auth_enabled',
          value: enabled.toString(),
          description: 'Whether fallback authentication is enabled'
        },
        {
          key: 'fallback_access_code',
          value: newCode,
          description: 'Current fallback access code'
        }
      ])

      const newSettings = {
        enabled,
        accessCode: newCode
      }

      setFallbackSettings(newSettings)
      
      // Also store in localStorage as backup
      localStorage.setItem('fallback_settings', JSON.stringify(newSettings))

      return { success: true, code: newCode }
    } catch (error) {
      console.error('Error toggling fallback auth:', error)
      return { success: false, error }
    }
  }

  // Login with fallback code
  const loginWithCode = async (code: string, name: string, email: string) => {
    // If settings aren't loaded yet, try to get them from localStorage
    let currentSettings = fallbackSettings
    if (!currentSettings.enabled && !currentSettings.accessCode) {
      const localSettings = localStorage.getItem('fallback_settings')
      if (localSettings) {
        try {
          currentSettings = JSON.parse(localSettings)
        } catch (error) {
          console.error('Error parsing local fallback settings:', error)
        }
      }
    }

    if (!currentSettings.enabled) {
      throw new Error('Fallback authentication is disabled')
    }

    if (code !== currentSettings.accessCode) {
      throw new Error('Invalid access code')
    }

    // Try to create a real Supabase user first
    let userId: string
    let supabaseSuccess = false

    try {
      // Create user with Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: `fallback_${Date.now()}`, // Temporary password
        options: {
          data: {
            full_name: name,
            email: email
          },
          emailRedirectTo: undefined // Skip email confirmation for fallback users
        }
      })

      if (authError) throw authError

      if (authData.user) {
        userId = authData.user.id
        supabaseSuccess = true

        // Create profile in database
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            full_name: name,
            email: email,
            role: 'player'
          })

        if (profileError) {
          console.warn('Profile creation failed:', profileError)
        }

        // Create a real user session
        const realUser: FallbackUser = {
          id: userId,
          full_name: name,
          email: email,
          role: 'player',
          created_at: new Date().toISOString()
        }

        setFallbackUser(realUser)
        return realUser
      }
    } catch (supabaseError) {
      console.warn('Supabase user creation failed, using fallback:', supabaseError)
    }

    // If Supabase fails, create fallback user
    const fallbackUser: FallbackUser = {
      id: `fallback_${Date.now()}`,
      full_name: name,
      email: email,
      role: 'player',
      created_at: new Date().toISOString()
    }

    // Store in localStorage for persistence
    localStorage.setItem('fallback_user', JSON.stringify(fallbackUser))
    setFallbackUser(fallbackUser)

    return fallbackUser
  }

  // Check for existing fallback session
  const checkFallbackSession = () => {
    const stored = localStorage.getItem('fallback_user')
    if (stored) {
      try {
        const user = JSON.parse(stored)
        setFallbackUser(user)
        return user
      } catch (error) {
        localStorage.removeItem('fallback_user')
      }
    }
    return null
  }

  // Logout from fallback
  const logoutFallback = () => {
    localStorage.removeItem('fallback_user')
    setFallbackUser(null)
  }

  useEffect(() => {
    fetchFallbackSettings()
    checkFallbackSession()
  }, [])

  return {
    fallbackSettings,
    fallbackUser,
    loading,
    toggleFallbackAuth,
    loginWithCode,
    logoutFallback,
    refreshSettings: fetchFallbackSettings
  }
}