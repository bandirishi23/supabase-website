import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true // Note: In production, you should proxy through your backend
})

export interface GeneratePitchParams {
  template: string
  contactData: Record<string, any>
}

// Check if OpenAI is configured
export const isOpenAIConfigured = () => {
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY
  return !!apiKey && apiKey.length > 0
}

// Fill template with contact data
export function fillTemplate(template: string, contactData: Record<string, any>): string {
  let filled = template
  
  // Replace all {{column}} placeholders with actual values
  Object.keys(contactData).forEach(key => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi')
    const value = contactData[key] || ''
    filled = filled.replace(regex, String(value))
  })
  
  return filled
}

// Extract placeholder names from template
export function extractPlaceholders(template: string): string[] {
  const regex = /{{(.*?)}}/g
  const placeholders: string[] = []
  let match
  
  while ((match = regex.exec(template)) !== null) {
    const placeholder = match[1].trim()
    if (placeholder && !placeholders.includes(placeholder)) {
      placeholders.push(placeholder)
    }
  }
  
  return placeholders
}

// Validate template against available columns
export function validateTemplate(template: string, availableColumns: string[]): {
  isValid: boolean
  invalidPlaceholders: string[]
  validPlaceholders: string[]
} {
  const placeholders = extractPlaceholders(template)
  const columnNamesLower = availableColumns.map(c => c.toLowerCase())
  
  const validPlaceholders: string[] = []
  const invalidPlaceholders: string[] = []
  
  placeholders.forEach(placeholder => {
    const placeholderLower = placeholder.toLowerCase()
    const matchingColumn = availableColumns.find(
      col => col.toLowerCase() === placeholderLower
    )
    
    if (matchingColumn) {
      validPlaceholders.push(placeholder)
    } else {
      invalidPlaceholders.push(placeholder)
    }
  })
  
  return {
    isValid: invalidPlaceholders.length === 0,
    invalidPlaceholders,
    validPlaceholders
  }
}

// Generate a single pitch using OpenAI
export async function generatePitch(params: GeneratePitchParams): Promise<string> {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI API key is not configured. Please add your API key to the environment variables.')
  }

  const { template, contactData } = params
  
  // Fill the template with contact data
  const filledPrompt = fillTemplate(template, contactData)
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates personalized, professional pitches based on the provided template and information. Keep the tone professional and engaging.'
        },
        {
          role: 'user',
          content: filledPrompt
        }
      ],
    
      
    })

    return response.choices[0]?.message?.content || 'Failed to generate pitch'
  } catch (error) {
    console.error('OpenAI API error:', error)
    if (error instanceof Error) {
      throw new Error(`Failed to generate pitch: ${error.message}`)
    }
    throw new Error('Failed to generate pitch')
  }
}

// Generate pitches for multiple contacts (batch processing)
export async function generatePitchBatch(
  template: string,
  contactsData: Record<string, any>[],
  onProgress?: (index: number, total: number, result: string | Error) => void
): Promise<Array<{ success: boolean; pitch?: string; error?: string; contactData: Record<string, any> }>> {
  const results = []
  
  for (let i = 0; i < contactsData.length; i++) {
    const contactData = contactsData[i]
    
    try {
      const pitch = await generatePitch({ template, contactData })
      results.push({ success: true, pitch, contactData })
      
      if (onProgress) {
        onProgress(i + 1, contactsData.length, pitch)
      }
      
      // Add a small delay to avoid rate limiting
      if (i < contactsData.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      results.push({ success: false, error: errorMessage, contactData })
      
      if (onProgress) {
        onProgress(i + 1, contactsData.length, new Error(errorMessage))
      }
    }
  }
  
  return results
}