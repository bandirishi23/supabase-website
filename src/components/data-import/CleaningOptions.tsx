import { useState } from 'react'
import { Trash2, Droplets, Type, Calendar, Hash } from 'lucide-react'

export interface CleaningOptions {
  removeEmptyRows: boolean
  removeDuplicates: boolean
  trimWhitespace: boolean
  convertDates: boolean
  parseNumbers: boolean
  lowercaseText: boolean
  uppercaseText: boolean
  titleCaseText: boolean
}

interface CleaningOptionsProps {
  onChange: (options: CleaningOptions) => void
}

export default function CleaningOptionsComponent({ onChange }: CleaningOptionsProps) {
  const [options, setOptions] = useState<CleaningOptions>({
    removeEmptyRows: true,
    removeDuplicates: false,
    trimWhitespace: true,
    convertDates: true,
    parseNumbers: true,
    lowercaseText: false,
    uppercaseText: false,
    titleCaseText: false
  })

  const updateOption = (key: keyof CleaningOptions, value: boolean) => {
    // Handle text case options - only one can be active at a time
    let newOptions = { ...options }
    
    if (key === 'lowercaseText' || key === 'uppercaseText' || key === 'titleCaseText') {
      newOptions.lowercaseText = false
      newOptions.uppercaseText = false
      newOptions.titleCaseText = false
    }
    
    newOptions[key] = value
    setOptions(newOptions)
    onChange(newOptions)
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Data Cleaning Options</h3>
      
      <div className="space-y-3">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <Trash2 className="h-4 w-4 mr-2" />
            Remove & Filter
          </h4>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={options.removeEmptyRows}
                onChange={(e) => updateOption('removeEmptyRows', e.target.checked)}
                className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-700">Remove empty rows</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={options.removeDuplicates}
                onChange={(e) => updateOption('removeDuplicates', e.target.checked)}
                className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-700">Remove duplicate rows</span>
            </label>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <Type className="h-4 w-4 mr-2" />
            Text Formatting
          </h4>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={options.trimWhitespace}
                onChange={(e) => updateOption('trimWhitespace', e.target.checked)}
                className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-700">Trim whitespace</span>
            </label>
            <div className="pl-6 space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="textCase"
                  checked={!options.lowercaseText && !options.uppercaseText && !options.titleCaseText}
                  onChange={() => {
                    updateOption('lowercaseText', false)
                    updateOption('uppercaseText', false)
                    updateOption('titleCaseText', false)
                  }}
                  className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">Keep original case</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="textCase"
                  checked={options.lowercaseText}
                  onChange={() => updateOption('lowercaseText', true)}
                  className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">Convert to lowercase</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="textCase"
                  checked={options.uppercaseText}
                  onChange={() => updateOption('uppercaseText', true)}
                  className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">Convert to UPPERCASE</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="textCase"
                  checked={options.titleCaseText}
                  onChange={() => updateOption('titleCaseText', true)}
                  className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">Convert to Title Case</span>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <Hash className="h-4 w-4 mr-2" />
            Data Type Conversion
          </h4>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={options.parseNumbers}
                onChange={(e) => updateOption('parseNumbers', e.target.checked)}
                className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-700">Parse numeric strings to numbers</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={options.convertDates}
                onChange={(e) => updateOption('convertDates', e.target.checked)}
                className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-700">Convert date strings to date format</span>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> These cleaning options will be applied to all selected columns where applicable.
        </p>
      </div>
    </div>
  )
}