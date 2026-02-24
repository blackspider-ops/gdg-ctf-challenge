import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useFallbackAuth } from '@/hooks/useFallbackAuth'
import { useEmergencyAdmin } from '@/hooks/useEmergencyAdmin'
import { AlertTriangle, Shield, Key } from 'lucide-react'

interface FallbackLoginProps {
  onSuccess: (user: any) => void
}

export const FallbackLogin = ({ onSuccess }: FallbackLoginProps) => {
  const [mode, setMode] = useState<'code' | 'emergency'>('code')
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    email: '',
    emergencyCode: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { fallbackSettings, loginWithCode } = useFallbackAuth()
  const { verifyEmergencyCode } = useEmergencyAdmin()

  const handleCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const user = await loginWithCode(formData.code, formData.name, formData.email)
      onSuccess(user)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEmergencyLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await verifyEmergencyCode(
        formData.emergencyCode,
        formData.email,
        formData.name
      )

      if (result.success) {
        onSuccess(result.user)
      } else {
        setError(result.error || 'Emergency access failed')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!fallbackSettings.enabled && mode === 'code') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Fallback Login Disabled
          </CardTitle>
          <CardDescription>
            Fallback authentication is currently disabled. Please try the normal login or contact an administrator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            onClick={() => setMode('emergency')}
            className="w-full"
          >
            <Shield className="w-4 h-4 mr-2" />
            Emergency Admin Access
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {mode === 'code' ? (
            <>
              <Key className="w-5 h-5 text-blue-500" />
              Fallback Login
            </>
          ) : (
            <>
              <Shield className="w-5 h-5 text-red-500" />
              Emergency Admin Access
            </>
          )}
        </CardTitle>
        <CardDescription>
          {mode === 'code' 
            ? 'Enter the access code provided by your administrator'
            : 'Enter your details and the emergency admin code'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={mode === 'code' ? handleCodeLogin : handleEmergencyLogin} className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Enter your email"
              required
            />
          </div>

          {mode === 'code' ? (
            <div>
              <Label htmlFor="code">Access Code</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                placeholder="Enter 5-digit code"
                maxLength={5}
                required
              />
            </div>
          ) : (
            <div>
              <Label htmlFor="emergencyCode">Emergency Admin Code</Label>
              <Input
                id="emergencyCode"
                value={formData.emergencyCode}
                onChange={(e) => setFormData(prev => ({ ...prev, emergencyCode: e.target.value }))}
                placeholder="Enter hexadecimal code"
                required
              />
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Verifying...' : mode === 'code' ? 'Login with Code' : 'Verify Emergency Access'}
          </Button>
        </form>

        <div className="text-center">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setMode(mode === 'code' ? 'emergency' : 'code')}
          >
            {mode === 'code' ? 'Emergency Admin Access' : 'Back to Code Login'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}