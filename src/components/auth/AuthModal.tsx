import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Mail, Loader2, Shield, AlertTriangle } from 'lucide-react'
import { CodeOfConductModal } from './CodeOfConductModal'
import { Logo } from '@/components/ui/logo'
import { FallbackLogin } from './FallbackLogin'
import { useFallbackAuth } from '@/hooks/useFallbackAuth'
import { useEmergencyAdmin } from '@/hooks/useEmergencyAdmin'
import { useAuth } from '@/hooks/useAuth'


interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const AuthModal = ({ open, onOpenChange }: AuthModalProps) => {
  const [psuId, setPsuId] = useState('')
  const [fullName, setFullName] = useState('')
  const [agreedToRules, setAgreedToRules] = useState(false)
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [showFallback, setShowFallback] = useState(false)
  const [supabaseError, setSupabaseError] = useState(false)
  const [fallbackName, setFallbackName] = useState('')
  const [fallbackEmail, setFallbackEmail] = useState('')
  const [fallbackCode, setFallbackCode] = useState('')
  const [showEmergencyInput, setShowEmergencyInput] = useState(false)
  const [emergencyCode, setEmergencyCode] = useState('')
  const { toast } = useToast()
  const { fallbackSettings, loginWithCode } = useFallbackAuth()
  const { checkEmergencySession, verifyEmergencyCode } = useEmergencyAdmin()
  const { refreshAuth } = useAuth()

  const fullEmail = psuId ? `${psuId}@psu.edu` : ''

  const validatePSUId = (id: string) => {
    return id.length > 0 && /^[a-zA-Z0-9]+$/.test(id)
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validatePSUId(psuId)) {
      toast({
        title: 'Error',
        description: 'Please enter a valid PSU ID',
        variant: 'destructive'
      })
      return
    }

    if (!fullName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your full name',
        variant: 'destructive'
      })
      return
    }

    if (!agreedToRules) {
      toast({
        title: 'Error',
        description: 'Please agree to the rules and code of conduct',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)

    try {
      // Send OTP code only
      const { error } = await supabase.auth.signInWithOtp({
        email: fullEmail.toLowerCase(),
        options: {
          data: {
            full_name: fullName.trim(),
            email: fullEmail.toLowerCase()
          },
          shouldCreateUser: true,
          emailRedirectTo: undefined // Explicitly disable redirect to force OTP
        }
      })

      if (error) throw error

      setOtpSent(true)
      setSupabaseError(false)
      toast({
        title: 'Check your email!',
        description: `We sent you a verification code to ${fullEmail}. Your account will be created after you verify your email.`,
      })
    } catch (error: any) {
      setSupabaseError(true)
      toast({
        title: 'Authentication Service Error',
        description: error.message || 'Failed to send verification code. You can try the fallback login below.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!otp || otp.length < 4) {
      toast({
        title: 'Error',
        description: 'Please enter the verification code',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)

    try {


      const { data, error } = await supabase.auth.verifyOtp({
        email: fullEmail.toLowerCase(),
        token: otp,
        type: 'email'
      })

      if (error) throw error

      // Manually ensure the profile exists after successful verification
      if (data.user) {
        try {
          const { error: profileError } = await (supabase as any).rpc('ensure_user_profile', {
            target_user_id: data.user.id
          })
          
          if (profileError) {
            console.error('Error ensuring profile:', profileError)
            // Don't throw here - user is authenticated, profile creation is secondary
          }
        } catch (error) {
          console.error('Profile creation failed:', error)
          // Continue anyway - user is authenticated
        }
      }

      toast({
        title: 'Welcome!',
        description: 'Your account has been created and you are now signed in.',
      })
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Invalid verification code',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFallbackLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Use the hook's loginWithCode function
      const user = await loginWithCode(fallbackCode, fallbackName, fallbackEmail)
      console.log('Fallback user created:', user)

      toast({
        title: 'Welcome!',
        description: `Signed in as ${user.full_name}`,
      })

      // Refresh auth state to pick up the new fallback user
      console.log('Calling refreshAuth after fallback login')
      await refreshAuth()
      onOpenChange(false)

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to login with code',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEmergencyAdminLogin = async () => {
    setLoading(true)
    
    try {
      const result = await verifyEmergencyCode(emergencyCode, fullEmail, fullName)
      
      if (result.success) {
        toast({
          title: 'Emergency Admin Access Granted!',
          description: 'Redirecting to admin panel...',
        })
        
        // Close modal and reload page to ensure auth state is loaded
        onOpenChange(false)
        
        // Show additional instruction
        setTimeout(() => {
          toast({
            title: 'Emergency Admin Ready!',
            description: 'Page reloading... Then go to /admin',
            duration: 3000
          })
        }, 500)
        
        // Reload page to ensure emergency session is loaded
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        toast({
          title: 'Error',
          description: 'Invalid emergency admin code',
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Emergency access failed',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFallbackSuccess = async (user: any) => {
    toast({
      title: 'Welcome!',
      description: `Signed in as ${user.full_name}`,
    })
    // Refresh auth state to pick up the fallback session
    await refreshAuth()
    onOpenChange(false)
  }



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Logo size="md" />
          </div>
          <DialogTitle className="text-gradient-cyber text-center">Join Decrypt Night</DialogTitle>
          <DialogDescription className="text-center">
            Open your account with your PSU ID to start competing
          </DialogDescription>
        </DialogHeader>

        {supabaseError && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Authentication Service Issue</span>
            </div>
            <p className="text-sm text-orange-700 mt-1">
              Having trouble with email verification? Try the fallback login below.
            </p>
          </div>
        )}

        {/* Fallback Login Section - Only show when enabled */}
        {fallbackSettings.enabled && (
          <Card className="card-cyber border-orange-500/30">
            <CardHeader>
              <CardTitle className="text-orange-400 text-lg">Alternative Login</CardTitle>
              <CardDescription>
                Use the access code provided by your administrator
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleFallbackLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fallback-name">Full Name</Label>
                  <Input
                    id="fallback-name"
                    value={fallbackName}
                    onChange={(e) => setFallbackName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fallback-psu-id">PSU ID</Label>
                  <div className="flex">
                    <Input
                      id="fallback-psu-id"
                      value={fallbackEmail.replace('@psu.edu', '')}
                      onChange={(e) => setFallbackEmail(e.target.value.replace(/[^a-zA-Z0-9]/g, '') + '@psu.edu')}
                      placeholder="abc123"
                      className="rounded-r-none border-r-0"
                      required
                    />
                    <div className="px-3 py-2 bg-muted border border-l-0 rounded-r-md flex items-center text-muted-foreground">
                      @psu.edu
                    </div>
                  </div>
                  {fallbackEmail && (
                    <p className="text-sm text-muted-foreground">
                      Email: <span className="text-primary font-medium">{fallbackEmail}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fallback-code">Access Code</Label>
                  <Input
                    id="fallback-code"
                    value={fallbackCode}
                    onChange={(e) => setFallbackCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
                    placeholder="Enter 5-digit code"
                    maxLength={5}
                    className="text-center text-lg tracking-widest font-mono"
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full btn-neon" 
                  disabled={loading || fallbackCode.length !== 5}
                >
                  {loading ? 'Signing In...' : 'Login with Code'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Only show regular signup when fallback is disabled */}
        {!fallbackSettings.enabled && (
          <Card className="card-cyber">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl">
                {otpSent ? 'Enter Verification Code' : 'Open Account'}
              </CardTitle>
              <CardDescription>
                {otpSent
                  ? 'Check your email for the verification code. Your account will be created after verification.'
                  : 'Enter your details to get started. Your account will be created after email verification.'
                }
              </CardDescription>
            </CardHeader>
          <CardContent>
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="psuId">PSU ID</Label>
                  <div className="flex">
                    <Input
                      id="psuId"
                      value={psuId}
                      onChange={(e) => setPsuId(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                      placeholder="abc123"
                      className="rounded-r-none border-r-0"
                      required
                    />
                    <div className="px-3 py-2 bg-muted border border-l-0 rounded-r-md flex items-center text-muted-foreground">
                      @psu.edu
                    </div>
                  </div>
                  {psuId && (
                    <p className="text-sm text-muted-foreground">
                      Verification code will be sent to: <span className="text-primary font-medium">{fullEmail}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rules"
                    checked={agreedToRules}
                    onCheckedChange={(checked) => setAgreedToRules(checked as boolean)}
                  />
                  <Label
                    htmlFor="rules"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I agree to the rules and{' '}
                    <CodeOfConductModal>
                      <button
                        type="button"
                        className="text-primary hover:text-primary/80 underline"
                      >
                        code of conduct
                      </button>
                    </CodeOfConductModal>
                  </Label>
                </div>

                <Button type="submit" className="w-full btn-neon" disabled={loading || !psuId || !fullName || !agreedToRules}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending code...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send Verification Code
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))}
                    placeholder="Enter code from email"
                    className="text-center text-lg tracking-widest"
                    required
                  />
                  <p className="text-sm text-muted-foreground text-center">
                    Enter the code sent to <span className="text-primary font-medium">{fullEmail}</span>
                  </p>
                  <p className="text-xs text-muted-foreground text-center">
                    Tip: If you have an emergency admin code, you can enter it here instead
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setOtpSent(false)
                      setOtp('')
                    }}
                    disabled={loading}
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1 btn-neon" disabled={loading || !otp}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify & Sign In'
                    )}
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-sm"
                  onClick={() => handleSendOtp(new Event('submit') as any)}
                  disabled={loading}
                >
                  Didn't receive the code? Send again
                </Button>

                {/* Emergency Admin Access Button */}
                <div className="relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute bottom-0 right-0 text-xs text-muted-foreground hover:text-red-400 p-1"
                    onClick={() => setShowEmergencyInput(!showEmergencyInput)}
                  >
                    🚨
                  </Button>
                  
                  {showEmergencyInput && (
                    <div className="mt-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                      <div className="space-y-2">
                        <Label className="text-red-400 text-xs">Emergency Admin Code</Label>
                        <Input
                          value={emergencyCode}
                          onChange={(e) => setEmergencyCode(e.target.value.toUpperCase())}
                          placeholder="Enter hexadecimal code"
                          className="text-xs bg-background border-red-500/30"
                          maxLength={12}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => {
                              setShowEmergencyInput(false)
                              setEmergencyCode('')
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="text-xs bg-red-600 hover:bg-red-700"
                            onClick={handleEmergencyAdminLogin}
                            disabled={loading || emergencyCode.length !== 12}
                          >
                            Emergency Access
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            )}
          </CardContent>
        </Card>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3 h-3" />
            <span>We use verification codes for secure, passwordless authentication</span>
          </div>
          

        </div>
      </DialogContent>
    </Dialog>
  )
}