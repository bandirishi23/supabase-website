import { supabase } from '../lib/supabase'

export interface SendEmailParams {
  to: string | string[]
  subject: string
  text?: string
  html: string
  from_email: string
  from_name: string
  reply_to?: string
  sendgrid_api_key: string
}

export interface EmailTemplate {
  to: string
  subject: string
  content: string
  recipientData: Record<string, any>
}

// SendGrid API endpoint
const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send'

// Send a single email using SendGrid
export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const {
    to,
    subject,
    text,
    html,
    from_email,
    from_name,
    reply_to,
    sendgrid_api_key
  } = params

  // Prepare personalizations
  const personalizations = Array.isArray(to) 
    ? [{ to: to.map(email => ({ email })) }]
    : [{ to: [{ email: to }] }]

  // Prepare request body
  const requestBody = {
    personalizations,
    from: {
      email: from_email,
      name: from_name
    },
    subject,
    content: [
      ...(text ? [{ type: 'text/plain', value: text }] : []),
      { type: 'text/html', value: html }
    ],
    ...(reply_to && { reply_to: { email: reply_to } })
  }

  try {
    const response = await fetch(SENDGRID_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgrid_api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.errors?.[0]?.message || `SendGrid API error: ${response.status}`)
    }

    // Get message ID from headers
    const messageId = response.headers.get('X-Message-Id')

    return {
      success: true,
      messageId: messageId || undefined
    }
  } catch (error) {
    console.error('SendGrid error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    }
  }
}

// Send batch emails with rate limiting
export async function sendBatchEmails(
  templates: EmailTemplate[],
  settings: {
    from_email: string
    from_name: string
    reply_to?: string
    sendgrid_api_key: string
    user_id: string
  },
  onProgress?: (current: number, total: number, result: any) => void
): Promise<Array<{ success: boolean; email: string; messageId?: string; error?: string }>> {
  const results = []
  const batchSize = 10 // Send 10 emails at a time
  const delayBetweenBatches = 2000 // 2 seconds between batches

  for (let i = 0; i < templates.length; i += batchSize) {
    const batch = templates.slice(i, Math.min(i + batchSize, templates.length))
    
    // Process batch in parallel
    const batchPromises = batch.map(async (template) => {
      const html = convertTextToHtml(template.content)
      
      const result = await sendEmail({
        to: template.to,
        subject: template.subject,
        text: template.content,
        html,
        from_email: settings.from_email,
        from_name: settings.from_name,
        reply_to: settings.reply_to,
        sendgrid_api_key: settings.sendgrid_api_key
      })

      // Save to database
      if (result.success) {
        await savePitchRecord({
          user_id: settings.user_id,
          recipient_data: template.recipientData,
          generated_subject: template.subject,
          generated_content: template.content,
          status: 'sent',
          email_sent_at: new Date().toISOString(),
          sendgrid_message_id: result.messageId
        })

        // Update daily send count
        await updateDailySendCount(settings.user_id)
      } else {
        await savePitchRecord({
          user_id: settings.user_id,
          recipient_data: template.recipientData,
          generated_subject: template.subject,
          generated_content: template.content,
          status: 'failed',
          error_message: result.error
        })
      }

      return {
        success: result.success,
        email: template.to,
        messageId: result.messageId,
        error: result.error
      }
    })

    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)

    // Report progress
    if (onProgress) {
      onProgress(Math.min(i + batchSize, templates.length), templates.length, batchResults)
    }

    // Delay before next batch (except for last batch)
    if (i + batchSize < templates.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
    }
  }

  return results
}

// Convert plain text to HTML with basic formatting
function convertTextToHtml(text: string): string {
  // Escape HTML characters
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

  // Convert line breaks to <br> and paragraphs
  const paragraphs = escaped.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
  
  // Wrap in basic HTML template
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          p {
            margin-bottom: 1em;
          }
        </style>
      </head>
      <body>
        ${paragraphs.join('\n')}
      </body>
    </html>
  `
}

// Save pitch record to database
async function savePitchRecord(data: {
  user_id: string
  recipient_data: Record<string, any>
  generated_subject: string
  generated_content: string
  status: string
  email_sent_at?: string
  sendgrid_message_id?: string
  error_message?: string
}) {
  try {
    const { error } = await supabase
      .from('generated_pitches')
      .insert(data)

    if (error) {
      console.error('Error saving pitch record:', error)
    }
  } catch (err) {
    console.error('Error saving pitch record:', err)
  }
}

// Update daily send count
async function updateDailySendCount(userId: string) {
  try {
    // First, reset count if it's a new day
    await supabase.rpc('reset_daily_email_limit')

    // Get current count and increment
    const { data: settings, error: fetchError } = await supabase
      .from('email_settings')
      .select('emails_sent_today')
      .eq('user_id', userId)
      .single()

    if (fetchError) {
      console.error('Error fetching send count:', fetchError)
      return
    }

    // Then increment the count
    const { error } = await supabase
      .from('email_settings')
      .update({ 
        emails_sent_today: (settings?.emails_sent_today || 0) + 1
      })
      .eq('user_id', userId)

    if (error) {
      console.error('Error updating send count:', error)
    }
  } catch (err) {
    console.error('Error updating send count:', err)
  }
}

// Check if user can send more emails today
export async function canSendEmails(userId: string): Promise<{ canSend: boolean; remaining: number; limit: number }> {
  try {
    const { data, error } = await supabase
      .from('email_settings')
      .select('daily_send_limit, emails_sent_today')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      return { canSend: false, remaining: 0, limit: 0 }
    }

    const remaining = Math.max(0, data.daily_send_limit - data.emails_sent_today)
    
    return {
      canSend: remaining > 0,
      remaining,
      limit: data.daily_send_limit
    }
  } catch (err) {
    console.error('Error checking send limit:', err)
    return { canSend: false, remaining: 0, limit: 0 }
  }
}

// Validate SendGrid API key by making a test request
export async function validateSendGridApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/scopes', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    return response.ok
  } catch (error) {
    console.error('Error validating SendGrid API key:', error)
    return false
  }
}

// Send a test email to verify configuration
export async function sendTestEmail(
  to: string,
  from_email: string,
  from_name: string,
  sendgrid_api_key: string
): Promise<{ success: boolean; error?: string }> {
  const testHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">DFW LANDS</h1>
        <p style="color: white; opacity: 0.9; margin-top: 10px; font-size: 16px;">Real Estate Solutions</p>
      </div>
      <div style="padding: 40px 20px; background: #f9f9f9;">
        <h2 style="color: #1c1c1c; margin-bottom: 20px;">✅ Test Email Successful!</h2>
        <p style="color: #666; line-height: 1.6; font-size: 15px;">
          Great news! Your email configuration is working correctly. You can now send property pitches to your leads.
        </p>
        <div style="margin-top: 30px; padding: 20px; background: white; border-radius: 8px; border-left: 4px solid #10b981;">
          <h3 style="color: #1c1c1c; margin-top: 0; font-size: 18px;">What's Next?</h3>
          <ul style="color: #666; line-height: 1.8; font-size: 14px;">
            <li>Import your property datasets</li>
            <li>Create pitch templates with placeholders</li>
            <li>Select leads and generate personalized pitches</li>
            <li>Send bulk emails to your prospects</li>
          </ul>
        </div>
        <div style="margin-top: 30px; padding: 20px; background: #e6fffa; border-radius: 8px; text-align: center;">
          <p style="color: #047857; margin: 0; font-size: 14px;">
            <strong>Configuration Details:</strong><br>
            From: ${from_name} &lt;${from_email}&gt;<br>
            Sent at: ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
      <div style="padding: 20px; background: #1c1c1c; text-align: center; border-radius: 0 0 8px 8px;">
        <p style="color: #999; margin: 0; font-size: 12px;">
          © ${new Date().getFullYear()} DFW LANDS. All rights reserved.
        </p>
      </div>
    </div>
  `

  const testText = `DFW LANDS - Test Email Successful!

Great news! Your email configuration is working correctly. You can now send property pitches to your leads.

What's Next?
- Import your property datasets
- Create pitch templates with placeholders
- Select leads and generate personalized pitches
- Send bulk emails to your prospects

Configuration Details:
From: ${from_name} <${from_email}>
Sent at: ${new Date().toLocaleString()}

© ${new Date().getFullYear()} DFW LANDS. All rights reserved.`

  const result = await sendEmail({
    to,
    subject: '✅ DFW LANDS - Test Email Successful',
    text: testText,
    html: testHtml,
    from_email,
    from_name,
    sendgrid_api_key
  })

  return result
}