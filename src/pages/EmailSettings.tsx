import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
// Removed unused import - now using direct API call
import {
  Mail,
  Settings,
  Save,
  AlertCircle,
  CheckCircle,
  Shield,
  Send,
  User,
  Key,
  Globe,
  Info,
  TestTube,
  Loader
} from 'lucide-react'

interface EmailSettingsData {
  id?: string
  from_email: string
  from_name: string
  reply_to_email: string
  sendgrid_api_key?: string // Optional since it's handled by Edge Function
  daily_send_limit: number
  emails_sent_today: number
  is_verified: boolean
}

export default function EmailSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<EmailSettingsData>({
    from_email: '',
    from_name: '',
    reply_to_email: '',
    daily_send_limit: 100,
    emails_sent_today: 0,
    is_verified: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  // Removed showApiKey state since API key field is no longer needed

  useEffect(() => {
    if (user) {
      fetchSettings()
    }
  }, [user])

  const fetchSettings = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase
        .from('email_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single()
      
      if (error && error.code !== 'PGRST116') { // Not found error
        throw error
      }
      
      if (data) {
        setSettings(data)
      } else {
        // Initialize with user's email
        setSettings(prev => ({
          ...prev,
          from_email: user?.email || '',
          reply_to_email: user?.email || '',
        }))
      }
    } catch (err) {
      console.error('Error fetching email settings:', err)
      setError('Failed to load email settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!settings.from_email || !settings.from_name) {
      setError('Please fill in all required fields')
      return
    }

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const settingsData = {
        user_id: user?.id,
        from_email: settings.from_email,
        from_name: settings.from_name,
        reply_to_email: settings.reply_to_email || settings.from_email,
        sendgrid_api_key: 'configured_via_edge_function', // Static value since API key is in Edge Function
        daily_send_limit: settings.daily_send_limit,
      }

      if (settings.id) {
        // Update existing settings
        const { error } = await supabase
          .from('email_settings')
          .update(settingsData)
          .eq('id', settings.id)
        
        if (error) throw error
      } else {
        // Insert new settings
        const { data, error } = await supabase
          .from('email_settings')
          .insert(settingsData)
          .select()
          .single()
        
        if (error) throw error
        setSettings({ ...settings, id: data.id })
      }

      setSuccess('Email settings saved successfully')
    } catch (err) {
      console.error('Error saving email settings:', err)
      setError('Failed to save email settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestEmail = async () => {
    if (!settings.from_email || !settings.from_name) {
      setError('Please configure your email settings first')
      return
    }

    if (!user?.email) {
      setError('User email not found')
      return
    }

    setIsTesting(true)
    setError(null)
    setSuccess(null)

    try {
      // First save the settings
      await handleSaveSettings()
      
      // Then test the email using the Edge Function
      const response = await fetch('https://ijjdclfibcjvnpxfcglc.supabase.co/functions/v1/quick-api', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: user.email,
          from: settings.from_email,
          fromName: settings.from_name,
          subject: '✅ DFW LANDS - Test Email Successful',
          html: `
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
                <div style="margin-top: 30px; padding: 20px; background: #e6fffa; border-radius: 8px; text-align: center;">
                  <p style="color: #047857; margin: 0; font-size: 14px;">
                    <strong>Configuration Details:</strong><br>
                    From: ${settings.from_name} &lt;${settings.from_email}&gt;<br>
                    Sent at: ${new Date().toLocaleString()}<br>
                    Using Supabase Edge Function
                  </p>
                </div>
              </div>
            </div>
          `
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setSuccess(`✅ Test email sent successfully to ${user.email}! Check your inbox.`)
        
        // Mark as verified
        if (!settings.is_verified && settings.id) {
          const { error } = await supabase
            .from('email_settings')
            .update({ is_verified: true })
            .eq('id', settings.id)
          
          if (!error) {
            setSettings({ ...settings, is_verified: true })
          }
        }
      } else {
        throw new Error(result.error || 'Failed to send test email')
      }
    } catch (err: any) {
      console.error('Error sending test email:', err)
      setError(`Failed to send test email: ${err.message}`)
    } finally {
      setIsTesting(false)
    }
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-yellow-900/20 border border-yellow-600 rounded-md p-4">
          <p className="text-yellow-400">Please log in to configure email settings.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-emerald-600" />
          <span className="ml-2 text-gray-400">Loading settings...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Email Settings</h1>
        <p className="mt-2 text-gray-400">
          Configure your sender information for sending property pitches
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-600 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2 mt-0.5" />
          <p className="text-red-400">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 bg-emerald-900/20 border border-emerald-600 rounded-md flex items-start">
          <CheckCircle className="h-5 w-5 text-emerald-400 mr-2 mt-0.5" />
          <p className="text-emerald-400">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Email Configuration */}
          
        

          {/* Sender Information */}
          <div className="bg-dark-300 rounded-lg p-6 border border-dark-border">
            <div className="flex items-center mb-4">
              <User className="h-5 w-5 text-emerald-500 mr-2" />
              <h2 className="text-lg font-semibold text-white">Sender Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  From Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={settings.from_email}
                  onChange={(e) => setSettings({ ...settings, from_email: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-200 border border-dark-border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-brand"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  From Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={settings.from_name}
                  onChange={(e) => setSettings({ ...settings, from_name: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-200 border border-dark-border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-brand"
                  placeholder="Your Name"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Reply-To Email
                </label>
                <input
                  type="email"
                  value={settings.reply_to_email}
                  onChange={(e) => setSettings({ ...settings, reply_to_email: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-200 border border-dark-border rounded-md text-white focus:outline-none focus:ring-2 focus:ring-brand"
                  placeholder="reply@email.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use the same as From Email
                </p>
              </div>
            </div>
          </div>

          {/* Sending Limits */}
          <div className="bg-dark-300 rounded-lg p-6 border border-dark-border">
            <div className="flex items-center mb-4">
              <Send className="h-5 w-5 text-emerald-500 mr-2" />
              <h2 className="text-lg font-semibold text-white">Sending Limits</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Daily Send Limit
              </label>
              <input
                type="number"
                value={settings.daily_send_limit}
                onChange={(e) => setSettings({ ...settings, daily_send_limit: parseInt(e.target.value) || 100 })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                min="1"
                max="10000"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum number of emails you can send per day
              </p>
            </div>

            {settings.emails_sent_today > 0 && (
              <div className="mt-4 p-3 bg-dark-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Emails sent today</span>
                  <span className="text-sm font-medium text-white">
                    {settings.emails_sent_today} / {settings.daily_send_limit}
                  </span>
                </div>
                <div className="mt-2 w-full bg-dark-100 rounded-full h-2">
                  <div
                    className="bg-brand h-2 rounded-full"
                    style={{ width: `${Math.min((settings.emails_sent_today / settings.daily_send_limit) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-dark-300 rounded-lg p-6 border border-dark-border">
            <div className="flex items-center mb-4">
              <Shield className="h-5 w-5 text-emerald-500 mr-2" />
              <h3 className="text-lg font-semibold text-white">Status</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Email Service</span>
                <span className="text-sm text-emerald-400">Ready</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Verification</span>
                {settings.is_verified ? (
                  <span className="text-sm text-emerald-400">Verified</span>
                ) : (
                  <span className="text-sm text-gray-500">Not verified</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Daily Limit</span>
                <span className="text-sm text-white">{settings.daily_send_limit} emails</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-800">
              <button
                onClick={handleTestEmail}
                disabled={isTesting || !settings.from_email || !settings.from_name}
                className="w-full px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isTesting ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Sending Test...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Send Test Email
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Sends a test email to {user?.email}
              </p>
            </div>
          </div>

          {/* Help Card */}
          <div className="bg-dark-300 rounded-lg p-6 border border-dark-border">
            <div className="flex items-center mb-4">
              <Globe className="h-5 w-5 text-emerald-500 mr-2" />
              <h3 className="text-lg font-semibold text-white">Resources</h3>
            </div>

            <div className="space-y-2">
              <a
                href="https://sendgrid.com/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-emerald-400 hover:text-emerald-300"
              >
                SendGrid Documentation →
              </a>
              <a
                href="https://sendgrid.com/docs/for-developers/sending-email/api-getting-started/"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-emerald-400 hover:text-emerald-300"
              >
                API Getting Started Guide →
              </a>
              <a
                href="https://sendgrid.com/docs/ui/sending-email/sender-verification/"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-emerald-400 hover:text-emerald-300"
              >
                Sender Verification Guide →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="px-6 py-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isSaving ? (
            <>
              <Loader className="h-5 w-5 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  )
}