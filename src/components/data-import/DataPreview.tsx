import { ParsedData, ColumnInfo } from '../../hooks/useExcelParser'
import { FileSpreadsheet, Info } from 'lucide-react'

interface DataPreviewProps {
  data: ParsedData
  columnInfo: ColumnInfo[]
  maxRows?: number
}

export default function DataPreview({ data, columnInfo, maxRows = 10 }: DataPreviewProps) {
  const previewRows = data.rows.slice(0, maxRows)
  
  const getTypeColor = (type: ColumnInfo['type']) => {
    switch (type) {
      case 'string': return 'bg-blue-100 text-blue-800'
      case 'number': return 'bg-green-100 text-green-800'
      case 'date': return 'bg-purple-100 text-purple-800'
      case 'boolean': return 'bg-yellow-100 text-yellow-800'
      case 'mixed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileSpreadsheet className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900">Data Preview</h3>
        </div>
        <div className="text-sm text-gray-500">
          Showing {previewRows.length} of {data.rows.length} rows
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
        <div className="flex">
          <Info className="h-5 w-5 text-yellow-400 mr-2" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">Column Analysis</p>
            <p className="mt-1">
              {columnInfo.length} columns detected. Review data types below and select columns to import.
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {data.headers.map((header, index) => {
                const info = columnInfo[index]
                return (
                  <th
                    key={index}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    <div className="space-y-1">
                      <div>{header}</div>
                      <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${getTypeColor(info?.type || 'string')}`}>
                        {info?.type || 'unknown'}
                      </span>
                      {info && (
                        <div className="text-xs font-normal text-gray-400">
                          {info.nullCount > 0 && `${info.nullCount} empty • `}
                          {info.uniqueCount} unique
                        </div>
                      )}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {previewRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap"
                  >
                    {cell === null || cell === undefined || cell === '' ? (
                      <span className="text-gray-400 italic">empty</span>
                    ) : typeof cell === 'boolean' ? (
                      <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${
                        cell ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {cell.toString()}
                      </span>
                    ) : cell instanceof Date ? (
                      cell.toLocaleDateString()
                    ) : (
                      String(cell).length > 50 ? String(cell).substring(0, 50) + '...' : String(cell)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.rows.length > maxRows && (
        <div className="text-center py-2 text-sm text-gray-500">
          ... and {data.rows.length - maxRows} more rows
        </div>
      )}
    </div>
  )
}