import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get certificate ID from URL
    const url = new URL(req.url)
    const certificateId = url.searchParams.get('id')
    const token = url.searchParams.get('token')

    if (!certificateId || !token) {
      return new Response('Missing certificate ID or token', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // Verify token matches certificate ID (simple security)
    const expectedToken = btoa(`cert-${certificateId}`)
    if (token !== expectedToken) {
      return new Response('Invalid token', { 
        status: 403, 
        headers: corsHeaders 
      })
    }

    // Get certificate from database - use service role to bypass RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: cert, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('id', certificateId)
      .single()

    if (error || !cert) {
      return new Response('Certificate not found', { 
        status: 404, 
        headers: corsHeaders 
      })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', cert.user_id)
      .single()

    if (!profile) {
      return new Response('User not found', { 
        status: 404, 
        headers: corsHeaders 
      })
    }

    // Get certificate template
    const { data: template } = await supabase
      .from('certificate_templates')
      .select('html_template')
      .eq('type', cert.type)
      .single()

    if (!template) {
      return new Response('Template not found', { 
        status: 404, 
        headers: corsHeaders 
      })
    }

    // Get event info
    const { data: eventSettings } = await supabase
      .from('event_settings')
      .select('event_title')
      .single()

    const eventTitle = eventSettings?.event_title || 'GDG CTF Challenge'

    // Replace variables in template
    const date = new Date(cert.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    let html = template.html_template
    html = html.replace(/\{\{RECIPIENT_NAME\}\}/g, profile.full_name)
    html = html.replace(/\{\{EVENT_TITLE\}\}/g, eventTitle)
    html = html.replace(/\{\{DATE\}\}/g, date)
    
    // Handle conditional blocks for ADDITIONAL_INFO
    if (cert.description) {
      html = html.replace(
        /\{\{#ADDITIONAL_INFO\}\}(.*?)\{\{\/ADDITIONAL_INFO\}\}/gs,
        (match, content) => content.replace(/\{\{ADDITIONAL_INFO\}\}/g, cert.description)
      )
      html = html.replace(/\{\{\^ADDITIONAL_INFO\}\}.*?\{\{\/ADDITIONAL_INFO\}\}/gs, '')
    } else {
      html = html.replace(/\{\{#ADDITIONAL_INFO\}\}.*?\{\{\/ADDITIONAL_INFO\}\}/gs, '')
      html = html.replace(/\{\{\^ADDITIONAL_INFO\}\}(.*?)\{\{\/ADDITIONAL_INFO\}\}/gs, '$1')
    }

    // Return HTML with download headers
    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${profile.full_name.replace(/\s+/g, '_')}_Certificate.html"`,
      },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
