import { useState } from 'react'
import { ColumnInfo } from '../../hooks/useExcelParser'
import { Check, X } from 'lucide-react'

interface ColumnSelectorProps {
  columns: ColumnInfo[]
  onSelectionChange: (selected: string[]) => void
}

export default function ColumnSelector({ columns, onSelectionChange }: ColumnSelectorProps) {
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(columns.map(c => c.name))
  )

  const toggleColumn = (columnName: string) => {
    const newSelection = new Set(selectedColumns)
    if (newSelection.has(columnName)) {
      newSelection.delete(columnName)
    } else {
      newSelection.add(columnName)
    }
    setSelectedColumns(newSelection)
    onSelectionChange(Array.from(newSelection))
  }

  const selectAll = () => {
    const allColumns = new Set(columns.map(c => c.name))
    setSelectedColumns(allColumns)
    onSelectionChange(Array.from(allColumns))
  }

  const deselectAll = () => {
    setSelectedColumns(new Set())
    onSelectionChange([])
  }

  const getTypeIcon = (type: ColumnInfo['type']) => {
    switch (type) {
      case 'string': return 'Aa'
      case 'number': return '123'
      case 'date': return '📅'
      case 'boolean': return '✓✗'
      case 'mixed': return '≈'
      default: return '?'
    }
  }

  const getTypeColor = (type: ColumnInfo['type']) => {
    switch (type) {
      case 'string': return 'text-blue-600 bg-blue-50'
      case 'number': return 'text-green-600 bg-green-50'
      case 'date': return 'text-purple-600 bg-purple-50'
      case 'boolean': return 'text-yellow-600 bg-yellow-50'
      case 'mixed': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Select Columns to Import</h3>
        <div className="space-x-2">
          <button
            onClick={selectAll}
            className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Select All
          </button>
          <button
            onClick={deselectAll}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-700 font-medium"
          >
            Deselect All
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-600">
        {selectedColumns.size} of {columns.length} columns selected
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {columns.map((column) => {
          const isSelected = selectedColumns.has(column.name)
          return (
            <div
              key={column.name}
              onClick={() => toggleColumn(column.name)}
              className={`
                relative border rounded-lg p-3 cursor-pointer transition-all
                ${isSelected 
                  ? 'border-indigo-500 bg-indigo-50' 
                  : 'border-gray-300 bg-white hover:border-gray-400'
                }
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded text-xs font-mono ${getTypeColor(column.type)}`}>
                      {getTypeIcon(column.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {column.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {column.type}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-500 space-y-1">
                    <div>{column.uniqueCount} unique values</div>
                    {column.nullCount > 0 && (
                      <div className="text-orange-600">{column.nullCount} empty cells</div>
                    )}
                    {column.sampleValues.length > 0 && (
                      <div className="truncate" title={column.sampleValues.join(', ')}>
                        Sample: {column.sampleValues.slice(0, 2).map(v => 
                          v === null ? 'null' : String(v)
                        ).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className={`ml-2 ${isSelected ? 'text-indigo-600' : 'text-gray-400'}`}>
                  {isSelected ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <div className="h-5 w-5 border-2 border-current rounded" />
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}