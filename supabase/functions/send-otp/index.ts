import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OTPRequest {
  email: string
  otp: string
  fullName: string
}

const getEmailTemplate = (otp: string, fullName: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GDG CTF - Verification Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Google Sans', 'Roboto', Arial, sans-serif; background-color: #0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);">
          <!-- Header with Google colors -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #4285F4, #EA4335, #FBBC04, #34A853);"></td>
          </tr>
          
          <!-- Logo and Title -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #f1f5f9; font-size: 28px; font-weight: 700;">
                GDG CTF Challenge
              </h1>
              <p style="margin: 10px 0 0; color: #94a3b8; font-size: 16px;">
                Google Developers Group at Penn State
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="margin: 0 0 20px; color: #e2e8f0; font-size: 16px; line-height: 1.6;">
                Hi ${fullName},
              </p>
              <p style="margin: 0 0 30px; color: #cbd5e1; font-size: 16px; line-height: 1.6;">
                Welcome to GDG CTF! Use the verification code below to complete your registration:
              </p>
              
              <!-- OTP Code Box -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 30px 0;">
                    <div style="background: linear-gradient(135deg, #4285F4, #34A853); padding: 20px 40px; border-radius: 12px; display: inline-block;">
                      <span style="color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                        ${otp}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 20px; color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                This code will expire in 10 minutes. If you didn't request this code, you can safely ignore this email.
              </p>
              
              <div style="margin: 30px 0; padding: 20px; background-color: #334155; border-left: 4px solid #4285F4; border-radius: 8px;">
                <p style="margin: 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                  <strong style="color: #e2e8f0;">Security Tip:</strong> Never share this code with anyone. GDG CTF staff will never ask for your verification code.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #0f172a; text-align: center;">
              <p style="margin: 0 0 10px; color: #64748b; font-size: 14px;">
                © 2026 Google Developers Group at Penn State
              </p>
              <p style="margin: 0; color: #475569; font-size: 12px;">
                Built with ❤️ for the Penn State developer community
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, otp, fullName }: OTPRequest = await req.json()

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'GDG Penn State <team@gdgpsu.dev>',
        to: [email],
        subject: `Your GDG CTF verification code: ${otp}`,
        html: getEmailTemplate(otp, fullName),
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message || 'Failed to send email')
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
