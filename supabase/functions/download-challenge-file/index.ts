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
    const url = new URL(req.url)
    const challengeId = url.searchParams.get('challenge')

    if (!challengeId) {
      return new Response('Missing challenge ID', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // Get challenge details
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: challenge, error } = await supabase
      .from('challenges')
      .select('attachment_url, attachment_filename')
      .eq('id', challengeId)
      .single()

    if (error || !challenge || !challenge.attachment_url) {
      return new Response('Challenge file not found', { 
        status: 404, 
        headers: corsHeaders 
      })
    }

    // Extract the file path from the URL
    const filePathMatch = challenge.attachment_url.match(/challenge-files\/(.+)$/)
    if (!filePathMatch) {
      return new Response('Invalid file URL', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    const filePath = filePathMatch[1]

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('challenge-files')
      .download(filePath)

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError)
      return new Response('Failed to download file', { 
        status: 500, 
        headers: corsHeaders 
      })
    }

    // Return file with proper headers
    return new Response(fileData, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${challenge.attachment_filename || 'challenge-file'}"`,
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
