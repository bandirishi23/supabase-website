import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import {
  History,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Download,
  Loader,
  AlertCircle,
  Send,
  Calendar,
  User,
  FileText,
  Trash2
} from 'lucide-react'

interface GeneratedPitch {
  id: string
  template_id: string | null
  dataset_id: string | null
  recipient_data: any
  generated_subject: string
  generated_content: string
  status: 'draft' | 'sent' | 'failed' | 'scheduled'
  email_sent_at: string | null
  email_opened_at: string | null
  email_clicked_at: string | null
  sendgrid_message_id: string | null
  error_message: string | null
  created_at: string
  template?: {
    name: string
    category: string
  }
  dataset?: {
    name: string
  }
}

export default function PitchHistory() {
  const { user } = useAuth()
  const [pitches, setPitches] = useState<GeneratedPitch[]>([])
  const [selectedPitch, setSelectedPitch] = useState<GeneratedPitch | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')

  useEffect(() => {
    if (user) {
      fetchPitches()
    }
  }, [user, statusFilter, dateFilter])

  // Add keyboard shortcut for ESC to close modal
  useEffect(() => {
    if (!selectedPitch) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedPitch(null)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedPitch])

  const fetchPitches = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      let query = supabase
        .from('generated_pitches')
        .select(`
          *,
          template:pitch_templates(name, category),
          dataset:datasets(name)
        `)
        .order('created_at', { ascending: false })

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      // Apply date filter
      if (dateFilter === 'today') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        query = query.gte('created_at', today.toISOString())
      } else if (dateFilter === 'week') {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        query = query.gte('created_at', weekAgo.toISOString())
      } else if (dateFilter === 'month') {
        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        query = query.gte('created_at', monthAgo.toISOString())
      }

      const { data, error } = await query

      if (error) throw error
      setPitches(data || [])
    } catch (err) {
      console.error('Error fetching pitches:', err)
      setError('Failed to load pitch history')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-400" />
      case 'scheduled':
        return <Clock className="h-4 w-4 text-yellow-400" />
      default:
        return <FileText className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'text-green-400 bg-green-900/20'
      case 'failed':
        return 'text-red-400 bg-red-900/20'
      case 'scheduled':
        return 'text-yellow-400 bg-yellow-900/20'
      default:
        return 'text-gray-400 bg-gray-800'
    }
  }

  const downloadPitch = (pitch: GeneratedPitch) => {
    const content = `Subject: ${pitch.generated_subject || 'No Subject'}

${pitch.generated_content}

---
Generated: ${format(new Date(pitch.created_at), 'PPpp')}
Status: ${pitch.status}
${pitch.template ? `Template: ${pitch.template.name}` : ''}
${pitch.dataset ? `Dataset: ${pitch.dataset.name}` : ''}
`

    const blob = new Blob([content], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pitch_${pitch.id.slice(0, 8)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const handleDeletePitch = async (pitchId: string) => {
    if (!window.confirm('Are you sure you want to delete this pitch? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('generated_pitches')
        .delete()
        .eq('id', pitchId)
      
      if (error) throw error
      
      setPitches(pitches.filter(p => p.id !== pitchId))
      setSuccess('Pitch deleted successfully')
      
      if (selectedPitch?.id === pitchId) {
        setSelectedPitch(null)
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Error deleting pitch:', err)
      setError('Failed to delete pitch')
      setTimeout(() => setError(null), 5000)
    }
  }

  const exportAllPitches = () => {
    const csvContent = [
      ['Date', 'Status', 'Subject', 'Recipient', 'Template', 'Dataset', 'Sent At', 'Opened At'],
      ...pitches.map(pitch => [
        format(new Date(pitch.created_at), 'yyyy-MM-dd HH:mm'),
        pitch.status,
        pitch.generated_subject || '',
        pitch.recipient_data?.email || pitch.recipient_data?.name || 'N/A',
        pitch.template?.name || 'N/A',
        pitch.dataset?.name || 'N/A',
        pitch.email_sent_at ? format(new Date(pitch.email_sent_at), 'yyyy-MM-dd HH:mm') : '',
        pitch.email_opened_at ? format(new Date(pitch.email_opened_at), 'yyyy-MM-dd HH:mm') : ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pitch_history_${format(new Date(), 'yyyy-MM-dd')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-yellow-900/20 border border-yellow-600 rounded-md p-4">
          <p className="text-yellow-400">Please log in to view pitch history.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Pitch History</h1>
          <p className="mt-2 text-gray-400">
            View and manage all your generated pitches
          </p>
        </div>
        {pitches.length > 0 && (
          <button
            onClick={exportAllPitches}
            className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 flex items-center"
          >
            <Download className="h-5 w-5 mr-2" />
            Export CSV
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 bg-gray-900 rounded-lg p-4 border border-gray-800">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Date Range</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>

          <div className="flex items-end">
            <div className="text-sm text-gray-400">
              Showing {pitches.length} pitch{pitches.length !== 1 ? 'es' : ''}
            </div>
          </div>
        </div>
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

      {/* Pitches List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-emerald-600" />
          <span className="ml-2 text-gray-400">Loading pitch history...</span>
        </div>
      ) : pitches.length === 0 ? (
        <div className="bg-gray-900 rounded-lg p-12 text-center border border-gray-800">
          <History className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No pitches found</h3>
          <p className="text-gray-400">
            {statusFilter !== 'all' || dateFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Generated pitches will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pitches.map((pitch) => (
            <div
              key={pitch.id}
              className="bg-gray-900 rounded-lg p-4 border border-gray-800 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(pitch.status)}`}>
                      {getStatusIcon(pitch.status)}
                      <span className="ml-1 capitalize">{pitch.status}</span>
                    </span>
                    
                    {pitch.template && (
                      <span className="text-xs text-gray-500">
                        Template: {pitch.template.name}
                      </span>
                    )}
                    
                    {pitch.dataset && (
                      <span className="text-xs text-gray-500">
                        Dataset: {pitch.dataset.name}
                      </span>
                    )}
                  </div>

                  {pitch.generated_subject && (
                    <h3 className="font-medium text-white mb-1">
                      {pitch.generated_subject}
                    </h3>
                  )}

                  <div className="flex items-center space-x-4 text-xs text-gray-400">
                    <span className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {format(new Date(pitch.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                    
                    {pitch.recipient_data?.email && (
                      <span className="flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        {pitch.recipient_data.email}
                      </span>
                    )}
                    
                    {pitch.email_sent_at && (
                      <span className="flex items-center">
                        <Send className="h-3 w-3 mr-1" />
                        Sent {format(new Date(pitch.email_sent_at), 'MMM d, h:mm a')}
                      </span>
                    )}
                    
                    {pitch.email_opened_at && (
                      <span className="flex items-center text-green-400">
                        <Eye className="h-3 w-3 mr-1" />
                        Opened
                      </span>
                    )}
                  </div>

                  {pitch.error_message && (
                    <div className="mt-2 text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded">
                      Error: {pitch.error_message}
                    </div>
                  )}
                </div>

                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => setSelectedPitch(pitch)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded"
                    title="View pitch"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => downloadPitch(pitch)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded"
                    title="Download pitch"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePitch(pitch.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded"
                    title="Delete pitch"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pitch Preview Modal */}
      {selectedPitch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden border border-gray-800">
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Pitch Preview</h2>
                <button
                  onClick={() => setSelectedPitch(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {selectedPitch.generated_subject && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-1">Subject</label>
                  <p className="text-white">{selectedPitch.generated_subject}</p>
                </div>
              )}
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-1">Content</label>
                <div className="bg-gray-800 rounded-lg p-4">
                  <pre className="text-white whitespace-pre-wrap font-sans">
                    {selectedPitch.generated_content}
                  </pre>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-gray-400 mb-1">Status</label>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedPitch.status)}`}>
                    {getStatusIcon(selectedPitch.status)}
                    <span className="ml-1 capitalize">{selectedPitch.status}</span>
                  </span>
                </div>
                
                <div>
                  <label className="block text-gray-400 mb-1">Created</label>
                  <p className="text-white">
                    {format(new Date(selectedPitch.created_at), 'PPpp')}
                  </p>
                </div>
                
                {selectedPitch.email_sent_at && (
                  <div>
                    <label className="block text-gray-400 mb-1">Sent At</label>
                    <p className="text-white">
                      {format(new Date(selectedPitch.email_sent_at), 'PPpp')}
                    </p>
                  </div>
                )}
                
                {selectedPitch.email_opened_at && (
                  <div>
                    <label className="block text-gray-400 mb-1">Opened At</label>
                    <p className="text-green-400">
                      {format(new Date(selectedPitch.email_opened_at), 'PPpp')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}