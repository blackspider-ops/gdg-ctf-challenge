import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useEmergencyAdmin } from '@/hooks/useEmergencyAdmin'

interface AuthGuardProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export const AuthGuard = ({ children, requireAdmin = false }: AuthGuardProps) => {
  const { user, profile, loading } = useAuth()
  const { checkEmergencySession } = useEmergencyAdmin()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Check for emergency admin session
  const emergencyAdmin = checkEmergencySession()
  


  useEffect(() => {
    // If emergency admin session exists, allow access immediately
    if (emergencyAdmin) {
      return
    }
    
    if (loading) {
      return
    }

    if (!user && !profile) {
      navigate('/', { state: { from: location.pathname }, replace: true })
      return
    }

    // For admin routes, wait for profile to load before checking role
    if (requireAdmin) {
      if (!profile) {
        // Profile is still loading, don't redirect yet
        return
      }
      
      if (profile.role !== 'admin' && profile.role !== 'owner') {
        navigate('/', { replace: true })
        return
      }
    }
  }, [user, profile, loading, navigate, location.pathname, requireAdmin, emergencyAdmin])

  // If emergency admin session exists, allow access immediately
  if (emergencyAdmin) {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // For admin routes, wait for profile to load
  if (requireAdmin && (!profile || (profile.role !== 'admin' && profile.role !== 'owner'))) {
    if (!profile) {
      // Still loading profile, show loading state
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-muted-foreground">Checking permissions...</span>
          </div>
        </div>
      )
    }
    // Profile loaded but not admin, will be redirected by useEffect
    return null
  }

  return <>{children}</>
}