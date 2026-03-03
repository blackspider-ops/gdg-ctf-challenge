import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Shield, AlertTriangle } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { useAuth } from '@/hooks/useAuth'


interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const AuthModal = ({ open, onOpenChange }: AuthModalProps) => {
  const [loading, setLoading] = useState(false)
  const [fullName, setFullName] = useState('')
  const [psuId, setPsuId] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const { toast } = useToast()
  const { refreshAuth } = useAuth()

  const fullEmail = psuId ? `${psuId}@psu.edu` : ''

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!psuId.trim() || !fullName.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)

    try {
      // Send OTP via Supabase (which now uses Resend SMTP)
      const { data, error } = await supabase.auth.signInWithOtp({
        email: fullEmail.toLowerCase(),
        options: {
          data: {
            full_name: fullName.trim(),
          },
          shouldCreateUser: true,
        }
      })

      if (error) throw error

      setOtpSent(true)
      toast({
        title: 'Check your email!',
        description: `We sent a verification code to ${fullEmail}`,
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send verification code',
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

      toast({
        title: 'Welcome!',
        description: 'You are now signed in.',
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

  const handleMicrosoftLogin = async () => {
    setLoading(true)
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          scopes: 'email',
          redirectTo: `https://ctf.gdgpsu.dev/`,
          queryParams: {
            prompt: 'select_account',
          }
        }
      })

      if (error) throw error

      // The redirect will happen automatically
      toast({
        title: 'Redirecting...',
        description: 'Taking you to Microsoft login',
      })
    } catch (error: any) {
      console.error('Microsoft login error:', error)
      toast({
        title: 'Authentication Error',
        description: error.message || 'Failed to initiate Microsoft login',
        variant: 'destructive'
      })
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Logo size="md" />
          </div>
          <DialogTitle className="text-gradient-cyber text-center">Join GDG CTF</DialogTitle>
          <DialogDescription className="text-center">
            Sign in with your Penn State Microsoft account
          </DialogDescription>
        </DialogHeader>

        <Card className="card-cyber">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Penn State Login</CardTitle>
            <CardDescription>
              Sign in with your official PSU account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleMicrosoftLogin}
              className="w-full btn-neon" 
              disabled={loading}
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Redirecting to Microsoft...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 0H10.9091V10.9091H0V0Z" fill="#F25022"/>
                    <path d="M12.0909 0H23V10.9091H12.0909V0Z" fill="#7FBA00"/>
                    <path d="M0 12.0909H10.9091V23H0V12.0909Z" fill="#00A4EF"/>
                    <path d="M12.0909 12.0909H23V23H12.0909V12.0909Z" fill="#FFB900"/>
                  </svg>
                  Sign in with Microsoft
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
              </div>
            </div>

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
                    <div className="px-3 py-2 bg-muted border border-l-0 rounded-r-md flex items-center text-muted-foreground text-sm">
                      @psu.edu
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading || !psuId || !fullName} variant="outline">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending code...
                    </>
                  ) : (
                    'Send Verification Code'
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
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Enter code from email"
                    className="text-center text-lg tracking-widest font-mono"
                    required
                  />
                  <p className="text-sm text-muted-foreground text-center">
                    Code sent to <span className="text-primary font-medium">{fullEmail}</span>
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
              </form>
            )}

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                {otpSent ? 'Check your PSU email for the verification code' : 'Secure authentication for Penn State students'}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3 h-3" />
            <span>Secure authentication through Microsoft Azure AD</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}