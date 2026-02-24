import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

// Generate a unique hexadecimal emergency admin code
// This should be set once and stored securely
const EMERGENCY_ADMIN_CODE = 'A7F3E9D2C8B1'

export const useEmergencyAdmin = () => {
  const [loading, setLoading] = useState(false)

  // Verify emergency admin code and create admin user
  const verifyEmergencyCode = async (
    code: string, 
    email: string, 
    fullName: string
  ) => {
    setLoading(true)
    
    try {
      // Verify the emergency code
      if (code.toUpperCase() !== EMERGENCY_ADMIN_CODE) {
        throw new Error('Invalid emergency admin code')
      }

      // Create emergency admin session directly (skip Supabase)
      const emergencyAdmin = {
        id: `emergency_admin_${Date.now()}`,
        full_name: fullName,
        email: email,
        role: 'admin' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        emergency_access: true
      }

      localStorage.setItem('emergency_admin', JSON.stringify(emergencyAdmin))

      return {
        success: true,
        user: emergencyAdmin
      }

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    } finally {
      setLoading(false)
    }
  }

  // Check for existing emergency admin session
  const checkEmergencySession = () => {
    const stored = localStorage.getItem('emergency_admin')
    if (stored) {
      try {
        const session = JSON.parse(stored)
        // Validate the session structure
        if (session && session.id && session.role === 'admin' && session.emergency_access) {
          return session
        } else {
          // Invalid session, clear it
          localStorage.removeItem('emergency_admin')
        }
      } catch (error) {
        localStorage.removeItem('emergency_admin')
      }
    }
    return null
  }

  // Logout emergency admin
  const logoutEmergencyAdmin = () => {
    localStorage.removeItem('emergency_admin')
    // Also clear any other potential emergency session data
    localStorage.removeItem('fallback_user')
    localStorage.removeItem('fallback_settings')
  }

  return {
    verifyEmergencyCode,
    checkEmergencySession,
    logoutEmergencyAdmin,
    loading,
    EMERGENCY_ADMIN_CODE // Export for README
  }
}