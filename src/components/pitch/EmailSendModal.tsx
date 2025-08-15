import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { sendBatchEmails, canSendEmails } from '../../services/sendgrid'
import { X, Mail, Send, AlertCircle, CheckCircle, Loader, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface EmailSendModalProps {
  isOpen: boolean
  onClose: () => void
  selectedRows: any[]
  generatedPitches: Map<number, { pitch: string; subject?: string }>
  columns: string[]
  userId: string
}

interface EmailTemplate {
  to: string
  subject: string
  content: string
  recipientData: any
}

export default function EmailSendModal({
  isOpen,
  onClose,
  selectedRows,
  generatedPitches,
  columns,
  userId
}: EmailSendModalProps) {
  const navigate = useNavigate()
  const [emailColumn, setEmailColumn] = useState('')
  const [nameColumn, setNameColumn] = useState('')
  const [subject, setSubject] = useState('Exciting Opportunity from DFW LANDS')
  const [isSending, setIsSending] = useState(false)
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [emailSettings, setEmailSettings] = useState<any>(null)
  const [canSend, setCanSend] = useState({ canSend: false, remaining: 0, limit: 0 })
  const [isLoadingSettings, setIsLoadingSettings] = useState(false)

  useEffect(() => {
    if (isOpen && userId) {
      fetchEmailSettings()
      checkSendLimit()
    }
  }, [isOpen, userId])

  // Add keyboard shortcut handler
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC to close
      if (e.key === 'Escape') {
        onClose()
      }
      // Ctrl/Cmd + Enter to send
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!isSending && emailSettings && canSend.canSend && selectedRows.length > 0 && emailColumn) {
          handleSendEmails()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSending, emailSettings, canSend, selectedRows, emailColumn])

  const fetchEmailSettings = async () => {
    setIsLoadingSettings(true)
    try {
      const { data, error } = await supabase
        .from('email_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      setEmailSettings(data)
      
      if (!data) {
        setError('Please configure your email settings first')
      }
    } catch (err) {
      console.error('Error fetching email settings:', err)
      setError('Failed to load email settings')
    } finally {
      setIsLoadingSettings(false)
    }
  }

  const checkSendLimit = async () => {
    const limit = await canSendEmails(userId)
    setCanSend(limit)
  }

  const handleSendEmails = async () => {
    if (!emailColumn) {
      setError('Please select the email column')
      return
    }

    if (!emailSettings || !emailSettings.sendgrid_api_key) {
      setError('Email settings not configured')
      return
    }

    if (!canSend.canSend) {
      setError(`Daily send limit reached. You can send ${canSend.remaining} more emails today.`)
      return
    }

    setIsSending(true)
    setError(null)
    setSuccess(null)
    setSendProgress({ current: 0, total: selectedRows.length })

    try {
      // Prepare email templates
      const emailTemplates = selectedRows.map((row, index) => {
        const pitchData = generatedPitches.get(index)
        const email = row[emailColumn]
        const name = nameColumn ? row[nameColumn] : email

        if (!email || !pitchData) {
          return null
        }

        return {
          to: email,
          subject: pitchData.subject || subject.replace('{{name}}', name || '').replace('{{email}}', email || ''),
          content: pitchData.pitch,
          recipientData: row
        }
      }).filter((template): template is EmailTemplate => template !== null)

      if (emailTemplates.length === 0) {
        throw new Error('No valid emails to send')
      }

      // Check if we can send all emails
      if (emailTemplates.length > canSend.remaining) {
        setError(`You can only send ${canSend.remaining} more emails today. Selected: ${emailTemplates.length}`)
        return
      }

      // Send emails in batches
      const results = await sendBatchEmails(
        emailTemplates,
        {
          from_email: emailSettings.from_email,
          from_name: emailSettings.from_name,
          reply_to: emailSettings.reply_to_email,
          sendgrid_api_key: emailSettings.sendgrid_api_key,
          user_id: userId
        },
        (current, total) => {
          setSendProgress({ current, total })
        }
      )

      const successCount = results.filter(r => r.success).length
      const failCount = results.filter(r => !r.success).length

      setSuccess(`Successfully sent ${successCount} emails${failCount > 0 ? ` (${failCount} failed)` : ''}`)
      
      // Refresh send limit
      await checkSendLimit()

      // Close modal after delay
      setTimeout(() => {
        onClose()
      }, 3000)
    } catch (err) {
      console.error('Error sending emails:', err)
      setError(err instanceof Error ? err.message : 'Failed to send emails')
    } finally {
      setIsSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-2xl w-full border border-gray-800">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Mail className="h-6 w-6 text-emerald-500" />
              <h2 className="text-xl font-semibold text-white">Send Emails</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Loading State */}
          {isLoadingSettings ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-8 w-8 animate-spin text-emerald-600" />
              <span className="ml-2 text-gray-400">Loading email settings...</span>
            </div>
          ) : /* Email Settings Status */
          !emailSettings ? (
            <div className="p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
                <div>
                  <p className="text-yellow-400 font-medium">Email settings not configured</p>
                  <p className="text-yellow-300 text-sm mt-1">
                    Please configure your SendGrid settings first.
                  </p>
                  <button
                    onClick={() => navigate('/email-settings')}
                    className="mt-2 px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                  >
                    <Settings className="h-4 w-4 inline mr-1" />
                    Configure Settings
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Send Limit Info */}
              <div className="p-4 bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Daily Send Limit</span>
                  <span className="text-white font-medium">
                    {canSend.remaining} / {canSend.limit} remaining
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full"
                    style={{ width: `${(canSend.remaining / canSend.limit) * 100}%` }}
                  />
                </div>
              </div>

              {/* Email Column Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Column <span className="text-red-400">*</span>
                </label>
                <select
                  value={emailColumn}
                  onChange={(e) => setEmailColumn(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select column containing emails</option>
                  {columns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

              {/* Name Column Selection (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Name Column (Optional)
                </label>
                <select
                  value={nameColumn}
                  onChange={(e) => setNameColumn(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select column containing names</option>
                  {columns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Line */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter email subject..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  You can use {'{{name}}'} and {'{{email}}'} placeholders
                </p>
              </div>

              {/* Email Preview */}
              {emailColumn && selectedRows.length > 0 && (
                <div className="p-4 bg-gray-800 rounded-lg">
                  <p className="text-sm font-medium text-gray-300 mb-2">Preview (First Email)</p>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-400">To:</span>{' '}
                      <span className="text-white">{selectedRows[0][emailColumn]}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">From:</span>{' '}
                      <span className="text-white">
                        {emailSettings.from_name} &lt;{emailSettings.from_email}&gt;
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Subject:</span>{' '}
                      <span className="text-white">
                        {subject
                          .replace('{{name}}', nameColumn ? selectedRows[0][nameColumn] : '')
                          .replace('{{email}}', selectedRows[0][emailColumn])}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Send Progress */}
              {isSending && (
                <div className="p-4 bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-300">
                      Sending email {sendProgress.current} of {sendProgress.total}...
                    </span>
                    <span className="text-sm text-emerald-400">
                      {Math.round((sendProgress.current / sendProgress.total) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(sendProgress.current / sendProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Alerts */}
              {error && (
                <div className="p-4 bg-red-900/20 border border-red-600 rounded-lg flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-400 mr-2 mt-0.5" />
                  <p className="text-red-400">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-4 bg-emerald-900/20 border border-emerald-600 rounded-lg flex items-start">
                  <CheckCircle className="h-5 w-5 text-emerald-400 mr-2 mt-0.5" />
                  <p className="text-emerald-400">{success}</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-6 border-t border-gray-800 flex justify-between">
          <div className="text-sm text-gray-400">
            {selectedRows.length} contacts selected
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSendEmails}
              disabled={isSending || !emailSettings || !canSend.canSend || selectedRows.length === 0}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSending ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Emails
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}