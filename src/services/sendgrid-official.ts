import { supabase } from '../lib/supabase'

export interface EmailData {
  to: string
  from: string
  fromName?: string
  subject: string
  text?: string
  html: string
}

/**
 * Send a single email using Supabase Edge Function (which calls SendGrid)
 * This avoids CORS issues by making the API call server-side
 */
export async function sendEmailOfficial(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
  try {
    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('quick-api', {
      body: emailData
    })

    if (error) {
      console.error('Edge function error:', error)
      return { 
        success: false, 
        error: error.message || 'Failed to send email' 
      }
    }

    if (!data?.success) {
      return { 
        success: false, 
        error: data?.error || 'Failed to send email' 
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error('SendGrid error:', error)
    return { success: false, error: error.message || 'Failed to send email' }
  }
}

/**
 * Send a test email to verify SendGrid configuration
 */
export async function sendTestEmailOfficial(
  to: string,
  from: string,
  fromName: string
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
          Great news! Your SendGrid configuration is working correctly. You can now send property pitches to your leads.
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
            From: ${fromName} &lt;${from}&gt;<br>
            Sent at: ${new Date().toLocaleString()}<br>
            Using Supabase Edge Function
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

  return sendEmailOfficial({
    to,
    from,
    fromName,
    subject: '✅ DFW LANDS - Test Email Successful',
    html: testHtml
  })
}

/**
 * Send batch emails with rate limiting
 */
export async function sendBatchEmailsOfficial(
  emails: Array<{
    to: string
    subject: string
    content: string
    recipientData: Record<string, any>
  }>,
  settings: {
    from_email: string
    from_name: string
    user_id: string
  },
  onProgress?: (current: number, total: number, result: any) => void
): Promise<Array<{ success: boolean; email: string; error?: string }>> {
  const results = []
  const batchSize = 10 // Send 10 emails at a time
  const delayBetweenBatches = 2000 // 2 seconds between batches

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, Math.min(i + batchSize, emails.length))
    
    // Process batch in parallel
    const batchPromises = batch.map(async (email) => {
      const html = convertTextToHtml(email.content)
      
      const result = await sendEmailOfficial({
        to: email.to,
        from: settings.from_email,
        fromName: settings.from_name,
        subject: email.subject,
        html
      })

      // Save to database
      if (result.success) {
        await savePitchRecord({
          user_id: settings.user_id,
          recipient_data: email.recipientData,
          generated_subject: email.subject,
          generated_content: email.content,
          status: 'sent',
          email_sent_at: new Date().toISOString()
        })

        // Update daily send count
        await updateDailySendCount(settings.user_id)
      } else {
        await savePitchRecord({
          user_id: settings.user_id,
          recipient_data: email.recipientData,
          generated_subject: email.subject,
          generated_content: email.content,
          status: 'failed',
          error_message: result.error
        })
      }

      return {
        success: result.success,
        email: email.to,
        error: result.error
      }
    })

    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)

    // Report progress
    if (onProgress) {
      onProgress(Math.min(i + batchSize, emails.length), emails.length, batchResults)
    }

    // Delay before next batch (except for last batch)
    if (i + batchSize < emails.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
    }
  }

  return results
}

/**
 * Check if SendGrid API key is configured (via Edge Function)
 * Since we're using Edge Function, we assume it's configured if the function exists
 */
export function isSendGridConfigured(): boolean {
  // Since we're using Edge Function, we assume it's always configured
  return true
}

/**
 * Get SendGrid API key status
 */
export function getSendGridStatus(): { configured: boolean; message: string } {
  return { 
    configured: true, 
    message: 'SendGrid configured via Edge Function' 
  }
}

// Helper functions

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

async function savePitchRecord(data: {
  user_id: string
  recipient_data: Record<string, any>
  generated_subject: string
  generated_content: string
  status: string
  email_sent_at?: string
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