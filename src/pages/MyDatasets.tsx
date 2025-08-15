import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import SelectableDataTable from '../components/data-table/SelectableDataTable'
import TemplateSelector from '../components/pitch/TemplateSelector'
import EmailSendModal from '../components/pitch/EmailSendModal'
import { FileSpreadsheet, Plus, Eye, Loader, MessageSquare, Mail, X } from 'lucide-react'
import { generatePitchBatch, validateTemplate, isOpenAIConfigured } from '../services/openai'

interface Dataset {
  id: string
  name: string
  original_filename: string
  total_rows: number
  column_mappings: any
  created_at: string
  updated_at: string
}

export default function MyDatasets() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null)
  const [datasetRows, setDatasetRows] = useState<any[]>([])
  const [selectedRows, setSelectedRows] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingRows, setIsLoadingRows] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Pitch generation state
  const [showPitchGenerator, setShowPitchGenerator] = useState(false)
  const [pitchTemplate, setPitchTemplate] = useState('')
  const [pitchSubject, setPitchSubject] = useState('')
  const [isGeneratingPitches, setIsGeneratingPitches] = useState(false)
  const [generatedPitches, setGeneratedPitches] = useState<Map<number, { pitch: string; status: string; generatedAt: string; subject?: string }>>(new Map())
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 })
  
  // Email sending state
  const [showEmailModal, setShowEmailModal] = useState(false)
  
  // Pitch preview state
  const [previewPitch, setPreviewPitch] = useState<{ index: number; content: string } | null>(null)

  useEffect(() => {
    if (user) {
      fetchDatasets()
    }
  }, [user])

  // Auto-load dataset from localStorage selection
  useEffect(() => {
    const checkSelectedDataset = () => {
      const savedDatasetId = localStorage.getItem('selectedDatasetId')
      if (savedDatasetId && datasets.length > 0) {
        const dataset = datasets.find(d => d.id === savedDatasetId)
        if (dataset && (!selectedDataset || selectedDataset.id !== dataset.id)) {
          loadDatasetRows(dataset)
        }
      }
    }
    
    checkSelectedDataset()
    
    // Listen for storage changes (from sidebar)
    const handleStorageChange = () => checkSelectedDataset()
    window.addEventListener('storage', handleStorageChange)
    
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [datasets, user])

  const fetchDatasets = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase
        .from('datasets')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setDatasets(data || [])
    } catch (err) {
      console.error('Error fetching datasets:', err)
      setError('Failed to load datasets')
    } finally {
      setIsLoading(false)
    }
  }

  const loadDatasetRows = async (dataset: Dataset) => {
    setIsLoadingRows(true)
    setSelectedDataset(dataset)
    setGeneratedPitches(new Map()) // Clear previous pitches
    setSelectedRows([])
    
    try {
      const { data, error } = await supabase
        .from('dataset_rows')
        .select('*')
        .eq('dataset_id', dataset.id)
        .order('row_index', { ascending: true })
      
      if (error) throw error
      
      // Extract row_data from each row
      const rows = data?.map(row => row.row_data) || []
      setDatasetRows(rows)
    } catch (err) {
      console.error('Error fetching dataset rows:', err)
      setError('Failed to load dataset data')
    } finally {
      setIsLoadingRows(false)
    }
  }


  const handleGeneratePitches = async () => {
    if (!isOpenAIConfigured()) {
      setError('OpenAI API key is not configured. Please add REACT_APP_OPENAI_API_KEY to your environment variables.')
      return
    }

    if (!selectedDataset || !pitchTemplate.trim()) {
      setError('Please select a dataset and enter a pitch template')
      return
    }

    if (selectedRows.length === 0) {
      setError('Please select at least one row to generate pitches')
      return
    }

    const availableColumns = Object.keys(selectedDataset.column_mappings || {})
    const validation = validateTemplate(pitchTemplate, availableColumns)
    
    if (!validation.isValid) {
      setError(`Invalid placeholders: ${validation.invalidPlaceholders.join(', ')}. Available columns: ${availableColumns.join(', ')}`)
      return
    }

    setIsGeneratingPitches(true)
    setError(null)

    try {
      const results = await generatePitchBatch(
        pitchTemplate,
        selectedRows, // Only generate for selected rows
        (current, total, result) => {
          setGenerationProgress({ current, total })
        }
      )
      
      // Store generated pitches with their row indices
      const newPitches = new Map(generatedPitches)
      selectedRows.forEach((row, index) => {
        const rowIndex = datasetRows.indexOf(row)
        if (rowIndex !== -1 && results[index]) {
          newPitches.set(rowIndex, {
            pitch: results[index].pitch || '',
            status: results[index].success ? 'generated' : 'failed',
            generatedAt: new Date().toISOString(),
            subject: pitchSubject
          })
        }
      })
      setGeneratedPitches(newPitches)

      // Save pitches to database
      if (user) {
        const pitchRecords = results.map((result, index) => ({
          user_id: user.id,
          dataset_id: selectedDataset.id,
          recipient_data: selectedRows[index],
          generated_subject: pitchSubject,
          generated_content: result.pitch || '',
          status: 'draft'
        }))

        await supabase.from('generated_pitches').insert(pitchRecords)
      }
    } catch (err) {
      console.error('Error generating pitches:', err)
      setError('Failed to generate pitches')
    } finally {
      setIsGeneratingPitches(false)
      setGenerationProgress({ current: 0, total: 0 })
    }
  }

  const handleTemplateSelect = (template: string, subject?: string) => {
    setPitchTemplate(template)
    if (subject) {
      setPitchSubject(subject)
    }
  }

  const handlePreviewPitch = (rowIndex: number, pitch: string) => {
    setPreviewPitch({ index: rowIndex, content: pitch })
  }

  const getAvailableColumns = () => {
    if (!selectedDataset) return []
    return Object.keys(selectedDataset.column_mappings || {})
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-yellow-900/20 border border-yellow-600 rounded-md p-4">
          <p className="text-yellow-400">Please log in to view your datasets.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">My Properties</h1>
          <p className="mt-2 text-gray-400">
            View and manage your imported property datasets
          </p>
        </div>
        <button
          onClick={() => navigate('/import-data')}
          className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Import New Dataset
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-600 rounded-md">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-emerald-600" />
          <span className="ml-2 text-gray-400">Loading datasets...</span>
        </div>
      ) : datasets.length === 0 ? (
        <div className="bg-gray-900 rounded-lg p-12 text-center border border-gray-800">
          <FileSpreadsheet className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No datasets yet</h3>
          <p className="text-gray-400 mb-6">
            Import your first property dataset to get started
          </p>
          <button
            onClick={() => navigate('/import-data')}
            className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
          >
            Import Your First Dataset
          </button>
        </div>
      ) : (
        <div>
          {selectedDataset ? (
              <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                {isLoadingRows ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader className="h-8 w-8 animate-spin text-emerald-600" />
                    <span className="ml-2 text-gray-400">Loading data...</span>
                  </div>
                ) : datasetRows.length > 0 ? (
                  <>
                    {/* Pitch Generator Section */}
                    <div className="mb-6 p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white flex items-center">
                          <MessageSquare className="h-5 w-5 mr-2 text-emerald-500" />
                          AI Pitch Generator
                        </h3>
                        <button
                          onClick={() => setShowPitchGenerator(!showPitchGenerator)}
                          className="text-sm text-emerald-400 hover:text-emerald-300"
                        >
                          {showPitchGenerator ? 'Hide' : 'Show'} Generator
                        </button>
                      </div>
                      
                      {showPitchGenerator && (
                        <div className="space-y-4">
                          {/* Template Selector */}
                          <TemplateSelector
                            onTemplateSelect={handleTemplateSelect}
                            userId={user?.id}
                          />

                          {/* Subject Line */}
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Email Subject (Optional)
                            </label>
                            <input
                              type="text"
                              value={pitchSubject}
                              onChange={(e) => setPitchSubject(e.target.value)}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              placeholder="Enter email subject..."
                            />
                          </div>

                          {/* Template Editor */}
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Pitch Template
                            </label>
                            <textarea
                              value={pitchTemplate}
                              onChange={(e) => setPitchTemplate(e.target.value)}
                              placeholder={`Enter your pitch template using placeholders like {{column_name}}...\n\nAvailable columns: ${getAvailableColumns().join(', ')}`}
                              className="w-full h-32 p-3 bg-gray-700 border border-gray-600 rounded-md text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Use {'{{column_name}}'} to insert data from your dataset
                            </p>
                          </div>
                          
                          <div className="flex space-x-3">
                            <button
                              onClick={handleGeneratePitches}
                              disabled={isGeneratingPitches || !pitchTemplate.trim() || selectedRows.length === 0}
                              className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                              {isGeneratingPitches ? (
                                <>
                                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Generate for {selectedRows.length} Selected
                                </>
                              )}
                            </button>
                            
                            {generatedPitches.size > 0 && (
                              <button
                                onClick={() => setShowEmailModal(true)}
                                disabled={selectedRows.length === 0}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                              >
                                <Mail className="h-4 w-4 mr-2" />
                                Send Emails
                              </button>
                            )}
                          </div>
                          
                          {isGeneratingPitches && (
                            <div className="bg-emerald-900/20 border border-emerald-600 rounded-md p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-emerald-400">
                                  Generating pitch {generationProgress.current} of {generationProgress.total}...
                                </span>
                                <span className="text-sm text-emerald-300">
                                  {Math.round((generationProgress.current / generationProgress.total) * 100)}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                                <div 
                                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Data Table with Selection */}
                    <SelectableDataTable
                      data={datasetRows}
                      columns={Object.keys(selectedDataset.column_mappings || {})}
                      title={selectedDataset.name}
                      enableExport={true}
                      onSelectionChange={setSelectedRows}
                      generatedPitches={generatedPitches}
                      onPreviewPitch={handlePreviewPitch}
                    />
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No data found in this dataset</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-900 rounded-lg p-12 text-center border border-gray-800">
                <Eye className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  Select a dataset to view
                </h3>
                <p className="text-gray-400">
                  Use the "My Leads" dropdown in the sidebar to select a dataset
                </p>
              </div>
            )}
        </div>
      )}

      {/* Email Send Modal */}
      <EmailSendModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        selectedRows={selectedRows}
        generatedPitches={new Map(selectedRows.map((row, index) => {
          const rowIndex = datasetRows.indexOf(row)
          const pitch = generatedPitches.get(rowIndex)
          return [index, pitch ? { pitch: pitch.pitch, subject: pitch.subject } : { pitch: '', subject: '' }]
        }))}
        columns={getAvailableColumns()}
        userId={user?.id || ''}
      />

      {/* Pitch Preview Modal */}
      {previewPitch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden border border-gray-800">
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Pitch Preview</h2>
                <button
                  onClick={() => setPreviewPitch(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <pre className="text-white whitespace-pre-wrap font-sans">
                {previewPitch.content}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}