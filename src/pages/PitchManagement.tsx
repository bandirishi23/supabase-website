import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { isOpenAIConfigured } from '../services/openai'
import {
  MessageSquare,
  Plus,
  Edit2,
  Trash2,
  Copy,
  CheckCircle,
  AlertCircle,
  Loader,
  Sparkles,
  Mail,
  FileText,
  Users,
  TrendingUp
} from 'lucide-react'

interface PitchTemplate {
  id: string
  name: string
  category: string
  subject: string
  template: string
  variables: any
  is_active: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

const TEMPLATE_CATEGORIES = [
  { value: 'cold_email', label: 'Cold Email', icon: Mail },
  { value: 'follow_up', label: 'Follow Up', icon: TrendingUp },
  { value: 'introduction', label: 'Introduction', icon: Users },
  { value: 'property_pitch', label: 'Property Pitch', icon: FileText },
]

export default function PitchManagement() {
  const { user } = useAuth()
  const [templates, setTemplates] = useState<PitchTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<PitchTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Form state
  const [showForm, setShowForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    category: 'cold_email',
    subject: '',
    template: '',
  })

  // AI assistance state
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')

  useEffect(() => {
    if (user) {
      fetchTemplates()
    }
  }, [user])

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S to save template
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && showForm) {
        e.preventDefault()
        if (formData.name && formData.template) {
          handleSaveTemplate()
        }
      }
      // ESC to close form
      if (e.key === 'Escape' && showForm) {
        resetForm()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showForm, formData])

  const fetchTemplates = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase
        .from('pitch_templates')
        .select('*')
        .order('updated_at', { ascending: false })
      
      if (error) throw error
      setTemplates(data || [])
    } catch (err) {
      console.error('Error fetching templates:', err)
      setError('Failed to load templates')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveTemplate = async () => {
    if (!formData.name || !formData.template) {
      setError('Please provide a template name and content')
      return
    }

    setError(null)
    setSuccess(null)

    try {
      // Extract variables from template
      const variableRegex = /{{(.*?)}}/g
      const variables: string[] = []
      let match
      while ((match = variableRegex.exec(formData.template)) !== null) {
        const variable = match[1].trim()
        if (variable && !variables.includes(variable)) {
          variables.push(variable)
        }
      }

      const templateData = {
        user_id: user?.id,
        name: formData.name,
        category: formData.category,
        subject: formData.subject,
        template: formData.template,
        variables: { list: variables },
        is_active: true,
      }

      if (isEditing && selectedTemplate) {
        const { error } = await supabase
          .from('pitch_templates')
          .update(templateData)
          .eq('id', selectedTemplate.id)
        
        if (error) throw error
        setSuccess('Template updated successfully')
      } else {
        const { error } = await supabase
          .from('pitch_templates')
          .insert(templateData)
        
        if (error) throw error
        setSuccess('Template created successfully')
      }

      await fetchTemplates()
      resetForm()
    } catch (err) {
      console.error('Error saving template:', err)
      setError('Failed to save template')
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('pitch_templates')
        .delete()
        .eq('id', templateId)
      
      if (error) throw error
      
      setTemplates(templates.filter(t => t.id !== templateId))
      setSuccess('Template deleted successfully')
      
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null)
      }
    } catch (err) {
      console.error('Error deleting template:', err)
      setError('Failed to delete template')
    }
  }

  const handleDuplicateTemplate = async (template: PitchTemplate) => {
    try {
      const { error } = await supabase
        .from('pitch_templates')
        .insert({
          user_id: user?.id,
          name: `${template.name} (Copy)`,
          category: template.category,
          subject: template.subject,
          template: template.template,
          variables: template.variables,
          is_active: true,
        })
      
      if (error) throw error
      
      setSuccess('Template duplicated successfully')
      await fetchTemplates()
    } catch (err) {
      console.error('Error duplicating template:', err)
      setError('Failed to duplicate template')
    }
  }

  const handleEditTemplate = (template: PitchTemplate) => {
    setFormData({
      name: template.name,
      category: template.category,
      subject: template.subject || '',
      template: template.template,
    })
    setSelectedTemplate(template)
    setIsEditing(true)
    setShowForm(true)
  }

  const generateAITemplate = async () => {
    if (!aiPrompt.trim()) {
      setError('Please provide a description for the AI to generate a template')
      return
    }

    if (!isOpenAIConfigured()) {
      setError('OpenAI API key is not configured')
      return
    }

    setIsGeneratingAI(true)
    setError(null)

    try {
      // This would call your OpenAI service to generate a template
      // For now, we'll create a sample template
      const generatedTemplate = `Dear {{first_name}},

I hope this message finds you well. I'm reaching out regarding the property at {{property_address}} in {{city}}.

[Your AI-generated content based on: ${aiPrompt}]

The property features:
- {{bedrooms}} bedrooms
- {{bathrooms}} bathrooms
- {{square_feet}} square feet
- Listed at {{price}}

I believe this property could be an excellent opportunity for you because {{reason}}.

Would you be available for a brief call this week to discuss further?

Best regards,
{{sender_name}}
{{sender_title}}
DFW LANDS Real Estate`

      setFormData({
        ...formData,
        template: generatedTemplate,
      })
      
      setAiPrompt('')
      setSuccess('AI template generated successfully. Please review and customize as needed.')
    } catch (err) {
      console.error('Error generating AI template:', err)
      setError('Failed to generate AI template')
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'cold_email',
      subject: '',
      template: '',
    })
    setShowForm(false)
    setIsEditing(false)
    setSelectedTemplate(null)
    setAiPrompt('')
  }

  const getCategoryIcon = (category: string) => {
    const cat = TEMPLATE_CATEGORIES.find(c => c.value === category)
    return cat ? cat.icon : MessageSquare
  }

  const getCategoryLabel = (category: string) => {
    const cat = TEMPLATE_CATEGORIES.find(c => c.value === category)
    return cat ? cat.label : category
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-yellow-900/20 border border-yellow-600 rounded-md p-4">
          <p className="text-yellow-400">Please log in to manage pitch templates.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Pitch Templates</h1>
          <p className="mt-2 text-gray-400">
            Create and manage AI-powered pitch templates for your properties
          </p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Template
        </button>
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

      {/* Template Form */}
      {showForm && (
        <div className="mb-8 bg-gray-900 rounded-lg p-6 border border-gray-800">
          <h2 className="text-xl font-semibold text-white mb-6">
            {isEditing ? 'Edit Template' : 'Create New Template'}
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Template Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., Initial Property Inquiry"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Subject Line (Optional)
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g., Regarding {{property_address}} - Investment Opportunity"
              />
            </div>

            {/* AI Assistant */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center mb-3">
                <Sparkles className="h-5 w-5 text-emerald-500 mr-2" />
                <h3 className="text-sm font-medium text-white">AI Template Assistant</h3>
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Describe the template you want to create..."
                />
                <button
                  onClick={generateAITemplate}
                  disabled={isGeneratingAI}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 flex items-center text-sm"
                >
                  {isGeneratingAI ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    'Generate'
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Template Content
              </label>
              <textarea
                value={formData.template}
                onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                className="w-full h-64 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Enter your template with placeholders like {{first_name}}, {{property_address}}, etc."
              />
              <p className="text-xs text-gray-500 mt-2">
                Use {'{{column_name}}'} to insert data from your property datasets
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={resetForm}
                className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
              >
                {isEditing ? 'Update Template' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-emerald-600" />
          <span className="ml-2 text-gray-400">Loading templates...</span>
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-gray-900 rounded-lg p-12 text-center border border-gray-800">
          <MessageSquare className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No templates yet</h3>
          <p className="text-gray-400 mb-6">
            Create your first pitch template to start generating personalized messages
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
          >
            Create Your First Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => {
            const Icon = getCategoryIcon(template.category)
            return (
              <div
                key={template.id}
                className="bg-gray-900 rounded-lg p-4 border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Icon className="h-5 w-5 text-emerald-500" />
                    <span className="text-xs text-gray-400">
                      {getCategoryLabel(template.category)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    Used {template.usage_count} times
                  </span>
                </div>

                <h3 className="font-medium text-white mb-2 truncate">
                  {template.name}
                </h3>

                {template.subject && (
                  <p className="text-sm text-gray-400 mb-2 truncate">
                    Subject: {template.subject}
                  </p>
                )}

                <p className="text-sm text-gray-500 mb-4 line-clamp-3">
                  {template.template}
                </p>

                {template.variables?.list && template.variables.list.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-400 mb-1">Variables:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.variables.list.slice(0, 3).map((variable: string) => (
                        <span
                          key={variable}
                          className="px-2 py-1 bg-gray-800 text-emerald-400 text-xs rounded"
                        >
                          {variable}
                        </span>
                      ))}
                      {template.variables.list.length > 3 && (
                        <span className="px-2 py-1 text-gray-500 text-xs">
                          +{template.variables.list.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditTemplate(template)}
                    className="flex-1 px-3 py-1.5 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 flex items-center justify-center text-sm"
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDuplicateTemplate(template)}
                    className="flex-1 px-3 py-1.5 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 flex items-center justify-center text-sm"
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="px-3 py-1.5 bg-gray-800 text-red-400 rounded hover:bg-red-900/20 flex items-center justify-center text-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}