import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!SENDGRID_API_KEY) {
      throw new Error('SendGrid API key not configured')
    }

    const { to, from, fromName, subject, text, html } = await req.json()

    // Validate required fields
    if (!to || !from || !subject || (!text && !html)) {
      throw new Error('Missing required fields: to, from, subject, and either text or html')
    }

    // Prepare SendGrid API request
    const requestBody = {
      personalizations: [{
        to: [{ email: to }]
      }],
      from: {
        email: from,
        name: fromName || 'DFW LANDS'
      },
      subject,
      content: [
        ...(text ? [{ type: 'text/plain', value: text }] : []),
        ...(html ? [{ type: 'text/html', value: html }] : [])
      ]
    }

    // Send email via SendGrid
    const response = await fetch(SENDGRID_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('SendGrid error:', errorData)
      throw new Error(errorData.errors?.[0]?.message || `SendGrid API error: ${response.status}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error in send-email function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send email' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})