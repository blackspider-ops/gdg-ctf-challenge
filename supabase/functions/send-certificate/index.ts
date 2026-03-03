import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { recipientEmail, recipientName, certificateHTML, certificateType, eventTitle, certificateId } = await req.json()

    console.log('Received request:', {
      recipientEmail,
      recipientName,
      certificateType,
      eventTitle,
      certificateId,
      htmlLength: certificateHTML?.length,
      htmlPreview: certificateHTML?.substring(0, 100)
    })

    if (!recipientEmail || !recipientName || !certificateHTML || !certificateId) {
      console.error('Missing fields:', { recipientEmail: !!recipientEmail, recipientName: !!recipientName, certificateHTML: !!certificateHTML, certificateId: !!certificateId })
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const typeLabels = {
      participation: 'Participation',
      winner: 'Winner',
      special: 'Special Recognition'
    }

    // Generate secure download token
    const downloadToken = btoa(`cert-${certificateId}`)
    const downloadUrl = `${SUPABASE_URL}/functions/v1/download-certificate?id=${certificateId}&token=${downloadToken}`
    
    console.log('Generated download URL for certificate:', certificateId)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'GDG Penn State <team@gdgpsu.dev>',
        to: [recipientEmail],
        subject: `🎉 Your ${typeLabels[certificateType as keyof typeof typeLabels] || 'Certificate'} - ${eventTitle}`,
        html: `
          <div style="font-family: 'Roboto', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
            <div style="background: linear-gradient(135deg, #4285F4, #34A853); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Congratulations, ${recipientName}! 🎉</h1>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                We're thrilled to present you with your <strong>${typeLabels[certificateType as keyof typeof typeLabels] || 'Certificate'}</strong> for participating in <strong>${eventTitle}</strong>!
              </p>
              
              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                Your certificate is ready! Click the button below to download it as an HTML file.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${downloadUrl}" style="display: inline-block; background: linear-gradient(135deg, #4285F4, #34A853); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  📥 Download Certificate
                </a>
              </div>
              
              <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #4285F4; font-size: 14px; margin: 0 0 15px 0; text-align: center;">
                  <strong>📥 How to Save as PDF</strong>
                </p>
                <ol style="color: rgba(255,255,255,0.8); font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>Click the download button above</li>
                  <li>Open the downloaded HTML file in your browser</li>
                  <li>Press <strong>Ctrl+P</strong> (Windows) or <strong>Cmd+P</strong> (Mac)</li>
                  <li>Select "Save as PDF" as the destination</li>
                  <li>Click Save</li>
                </ol>
              </div>
              
              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                Share your achievement on LinkedIn, add it to your portfolio, or print it for your records!
              </p>
              
              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                Thank you for being part of our community and contributing to the success of this event!
              </p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #f0f0f0;">
                <p style="font-size: 14px; color: #666; margin: 5px 0;">
                  Best regards,<br>
                  <strong style="color: #4285F4;">GDG Penn State Team</strong>
                </p>
                <p style="font-size: 12px; color: #999; margin-top: 15px;">
                  Google Developers Group - Penn State University<br>
                  Built with ❤️ for the Penn State developer community
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; padding: 15px;">
              <div style="display: inline-block; height: 4px; width: 200px; background: linear-gradient(90deg, #4285F4 0%, #EA4335 33%, #FBBC04 66%, #34A853 100%); border-radius: 2px;"></div>
            </div>
          </div>
        `,
      }),
    })

    console.log('Resend API response status:', res.status)

    if (!res.ok) {
      const error = await res.text()
      console.error('Resend API error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await res.json()
    console.log('Email sent successfully:', data)
    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
