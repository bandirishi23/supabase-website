import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import DataTable from '../components/data-table/DataTable'
import { FileSpreadsheet, Plus, Trash2, Eye, Loader, Calendar, Hash } from 'lucide-react'
import { format } from 'date-fns'

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
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingRows, setIsLoadingRows] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchDatasets()
    }
  }, [user])

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

  const deleteDataset = async (datasetId: string) => {
    if (!window.confirm('Are you sure you want to delete this dataset? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('datasets')
        .delete()
        .eq('id', datasetId)
      
      if (error) throw error
      
      // Remove from local state
      setDatasets(datasets.filter(d => d.id !== datasetId))
      if (selectedDataset?.id === datasetId) {
        setSelectedDataset(null)
        setDatasetRows([])
      }
    } catch (err) {
      console.error('Error deleting dataset:', err)
      setError('Failed to delete dataset')
    }
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-yellow-800">Please log in to view your datasets.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Datasets</h1>
          <p className="mt-2 text-gray-600">
            View and manage your imported Excel datasets
          </p>
        </div>
        <button
          onClick={() => navigate('/import-data')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Import New Dataset
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-indigo-600" />
          <span className="ml-2 text-gray-600">Loading datasets...</span>
        </div>
      ) : datasets.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <FileSpreadsheet className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No datasets yet</h3>
          <p className="text-gray-600 mb-6">
            Import your first Excel file to get started
          </p>
          <button
            onClick={() => navigate('/import-data')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Import Your First Dataset
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dataset List */}
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Datasets</h2>
            <div className="space-y-3">
              {datasets.map((dataset) => (
                <div
                  key={dataset.id}
                  className={`
                    bg-white border rounded-lg p-4 cursor-pointer transition-all
                    ${selectedDataset?.id === dataset.id 
                      ? 'border-indigo-500 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                  onClick={() => loadDatasetRows(dataset)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {dataset.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {dataset.original_filename}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center">
                          <Hash className="h-3 w-3 mr-1" />
                          {dataset.total_rows} rows
                        </span>
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {format(new Date(dataset.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          loadDatasetRows(dataset)
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="View data"
                      >
                        <Eye className="h-4 w-4 text-gray-500" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteDataset(dataset.id)
                        }}
                        className="p-1 hover:bg-red-50 rounded"
                        title="Delete dataset"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dataset Data View */}
          <div className="lg:col-span-2">
            {selectedDataset ? (
              <div className="bg-white shadow rounded-lg p-6">
                {isLoadingRows ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader className="h-8 w-8 animate-spin text-indigo-600" />
                    <span className="ml-2 text-gray-600">Loading data...</span>
                  </div>
                ) : datasetRows.length > 0 ? (
                  <DataTable
                    data={datasetRows}
                    columns={Object.keys(selectedDataset.column_mappings || {})}
                    title={selectedDataset.name}
                    enableExport={true}
                  />
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No data found in this dataset</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg p-12 text-center">
                <Eye className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a dataset to view
                </h3>
                <p className="text-gray-600">
                  Click on any dataset from the list to view its data
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}