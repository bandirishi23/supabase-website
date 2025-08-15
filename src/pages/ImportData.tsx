import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import FileUpload from '../components/data-import/FileUpload'
import DataPreview from '../components/data-import/DataPreview'
import ColumnSelector from '../components/data-import/ColumnSelector'
import CleaningOptionsComponent, { CleaningOptions } from '../components/data-import/CleaningOptions'
import DataTable from '../components/data-table/DataTable'
import { useExcelParser, ParsedData, ColumnInfo } from '../hooks/useExcelParser'
import { cleanData, prepareDataForSupabase, generateColumnMappings } from '../lib/dataUtils'
import { CheckCircle, AlertCircle, Loader } from 'lucide-react'

export default function ImportData() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { parseFile, isLoading: isParsing } = useExcelParser()
  
  const [step, setStep] = useState(1) // 1: Upload, 2: Select Columns, 3: Clean, 4: Review, 5: Success
  const [fileName, setFileName] = useState('')
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [columnInfo, setColumnInfo] = useState<ColumnInfo[]>([])
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [cleaningOptions, setCleaningOptions] = useState<CleaningOptions>({
    removeEmptyRows: true,
    removeDuplicates: false,
    trimWhitespace: true,
    convertDates: true,
    parseNumbers: true,
    lowercaseText: false,
    uppercaseText: false,
    titleCaseText: false
  })
  const [cleanedData, setCleanedData] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [datasetName, setDatasetName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = async (file: File) => {
    setFileName(file.name)
    setDatasetName(file.name.replace(/\.[^/.]+$/, '')) // Remove extension
    const result = await parseFile(file)
    
    if (result) {
      setParsedData(result.data)
      setColumnInfo(result.columnInfo)
      setSelectedColumns(result.data.headers)
      setStep(2)
    }
  }

  const handleColumnSelection = (selected: string[]) => {
    setSelectedColumns(selected)
  }

  const proceedToClean = () => {
    if (selectedColumns.length === 0) {
      setError('Please select at least one column')
      return
    }
    setError(null)
    setStep(3)
  }

  const proceedToReview = () => {
    if (!parsedData) return
    
    const cleaned = cleanData(
      parsedData.rawData,
      selectedColumns,
      cleaningOptions
    )
    setCleanedData(cleaned)
    setStep(4)
  }

  const saveToSupabase = async () => {
    if (!user) {
      setError('You must be logged in to save data')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      // Create dataset record
      const { data: dataset, error: datasetError } = await supabase
        .from('datasets')
        .insert({
          user_id: user.id,
          name: datasetName,
          original_filename: fileName,
          total_rows: cleanedData.length,
          column_mappings: generateColumnMappings(selectedColumns, columnInfo)
        })
        .select()
        .single()

      if (datasetError) throw datasetError

      // Prepare and insert rows in batches
      const rows = prepareDataForSupabase(cleanedData, selectedColumns, dataset.id)
      const batchSize = 100
      
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize)
        const { error: rowsError } = await supabase
          .from('dataset_rows')
          .insert(batch)
        
        if (rowsError) throw rowsError
      }

      setStep(5)
    } catch (err) {
      console.error('Error saving to Supabase:', err)
      setError(err instanceof Error ? err.message : 'Failed to save data')
    } finally {
      setIsSaving(false)
    }
  }

  const startOver = () => {
    setStep(1)
    setFileName('')
    setParsedData(null)
    setColumnInfo([])
    setSelectedColumns([])
    setCleanedData([])
    setDatasetName('')
    setError(null)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Import Excel Data</h1>
        <p className="mt-2 text-gray-600">
          Upload your Excel file, select columns, clean your data, and save it securely
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center">
          {[
            { num: 1, label: 'Upload' },
            { num: 2, label: 'Select Columns' },
            { num: 3, label: 'Clean Data' },
            { num: 4, label: 'Review' },
            { num: 5, label: 'Complete' }
          ].map((s, index) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full
                ${step >= s.num 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-200 text-gray-500'
                }
              `}>
                {step > s.num ? (
                  <CheckCircle className="h-6 w-6" />
                ) : (
                  s.num
                )}
              </div>
              <div className="ml-2 text-sm font-medium text-gray-900">{s.label}</div>
              {index < 4 && (
                <div className={`flex-1 h-0.5 mx-4 ${
                  step > s.num ? 'bg-indigo-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2 mt-0.5" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white shadow rounded-lg p-6">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Upload Your File</h2>
            <FileUpload onFileSelect={handleFileSelect} />
            {isParsing && (
              <div className="flex items-center justify-center py-8">
                <Loader className="h-8 w-8 animate-spin text-indigo-600" />
                <span className="ml-2 text-gray-600">Parsing file...</span>
              </div>
            )}
          </div>
        )}

        {step === 2 && parsedData && (
          <div className="space-y-6">
            <DataPreview data={parsedData} columnInfo={columnInfo} />
            <ColumnSelector columns={columnInfo} onSelectionChange={handleColumnSelection} />
            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={proceedToClean}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Next: Clean Data
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <CleaningOptionsComponent onChange={setCleaningOptions} />
            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={proceedToReview}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Apply & Review
              </button>
            </div>
          </div>
        )}

        {step === 4 && cleanedData.length > 0 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dataset Name
                </label>
                <input
                  type="text"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter a name for your dataset"
                />
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <p className="text-sm text-blue-800">
                  <strong>Final Review:</strong> {cleanedData.length} rows × {selectedColumns.length} columns
                  will be saved to your secure database.
                </p>
              </div>
            </div>
            
            <DataTable 
              data={cleanedData} 
              columns={selectedColumns}
              title="Cleaned Data Preview"
            />
            
            <div className="flex justify-between">
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={saveToSupabase}
                disabled={isSaving || !datasetName.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
              >
                {isSaving ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save to Database'
                )}
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Success!</h2>
            <p className="text-gray-600 mb-8">
              Your data has been successfully imported and saved.
            </p>
            <div className="space-x-4">
              <button
                onClick={() => navigate('/my-datasets')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                View My Datasets
              </button>
              <button
                onClick={startOver}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Import Another File
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}