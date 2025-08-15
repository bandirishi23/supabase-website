import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { FileText, ChevronDown, Sparkles, Clock } from 'lucide-react'

interface PitchTemplate {
  id: string
  name: string
  category: string
  subject: string
  template: string
  variables: any
  usage_count: number
}

interface TemplateSelectorProps {
  onTemplateSelect: (template: string, subject?: string) => void
  userId?: string
}

export default function TemplateSelector({ onTemplateSelect, userId }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<PitchTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<PitchTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    if (userId) {
      fetchTemplates()
    }
  }, [userId])

  const fetchTemplates = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('pitch_templates')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('usage_count', { ascending: false })

      if (error) throw error
      setTemplates(data || [])
    } catch (err) {
      console.error('Error fetching templates:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectTemplate = (template: PitchTemplate) => {
    setSelectedTemplate(template)
    onTemplateSelect(template.template, template.subject)
    setDropdownOpen(false)

    // Update usage count
    supabase
      .from('pitch_templates')
      .update({ usage_count: template.usage_count + 1 })
      .eq('id', template.id)
      .then(() => {
        // Update local state
        setTemplates(prev => 
          prev.map(t => 
            t.id === template.id 
              ? { ...t, usage_count: t.usage_count + 1 }
              : t
          )
        )
      })
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'cold_email':
        return 'text-blue-400 bg-blue-900/30'
      case 'follow_up':
        return 'text-yellow-400 bg-yellow-900/30'
      case 'introduction':
        return 'text-purple-400 bg-purple-900/30'
      case 'property_pitch':
        return 'text-emerald-400 bg-emerald-900/30'
      default:
        return 'text-gray-400 bg-gray-800'
    }
  }

  const getCategoryLabel = (category: string) => {
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Use Saved Template
      </label>
      
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <FileText className="h-5 w-5 text-emerald-500" />
          <div className="text-left">
            {selectedTemplate ? (
              <>
                <p className="text-white font-medium">{selectedTemplate.name}</p>
                <p className="text-xs text-gray-400">
                  {getCategoryLabel(selectedTemplate.category)} • Used {selectedTemplate.usage_count} times
                </p>
              </>
            ) : (
              <>
                <p className="text-white">Select a template</p>
                <p className="text-xs text-gray-400">
                  {templates.length} templates available
                </p>
              </>
            )}
          </div>
        </div>
        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${
          dropdownOpen ? 'rotate-180' : ''
        }`} />
      </button>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 rounded-lg shadow-xl border border-gray-700 max-h-96 overflow-y-auto z-50">
          {isLoading ? (
            <div className="p-4 text-center text-gray-400">
              Loading templates...
            </div>
          ) : templates.length === 0 ? (
            <div className="p-6 text-center">
              <Sparkles className="h-8 w-8 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400">No templates found</p>
              <p className="text-xs text-gray-500 mt-1">
                Create templates in the Pitch Templates page
              </p>
            </div>
          ) : (
            <>
              {/* Custom Template Option */}
              <button
                onClick={() => {
                  setSelectedTemplate(null)
                  onTemplateSelect('', '')
                  setDropdownOpen(false)
                }}
                className="w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors border-b border-gray-700"
              >
                <div className="flex items-center space-x-3">
                  <Sparkles className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="text-white font-medium">Custom Template</p>
                    <p className="text-xs text-gray-400">
                      Write your own template
                    </p>
                  </div>
                </div>
              </button>

              {/* Saved Templates */}
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors ${
                    selectedTemplate?.id === template.id ? 'bg-gray-700' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-white font-medium">{template.name}</p>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          getCategoryColor(template.category)
                        }`}>
                          {getCategoryLabel(template.category)}
                        </span>
                      </div>
                      {template.subject && (
                        <p className="text-xs text-gray-400 mb-1">
                          Subject: {template.subject}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {template.template}
                      </p>
                      {template.variables?.list && template.variables.list.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {template.variables.list.slice(0, 3).map((variable: string) => (
                            <span
                              key={variable}
                              className="px-2 py-0.5 bg-gray-900 text-emerald-400 text-xs rounded"
                            >
                              {variable}
                            </span>
                          ))}
                          {template.variables.list.length > 3 && (
                            <span className="px-2 py-0.5 text-gray-500 text-xs">
                              +{template.variables.list.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="ml-3 flex items-center space-x-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>{template.usage_count}</span>
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}