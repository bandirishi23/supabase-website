import { useMemo, useState, useEffect } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  RowSelectionState
} from '@tanstack/react-table'
import { ChevronUp, ChevronDown, Search, Download, CheckSquare, Square, Eye } from 'lucide-react'
import * as XLSX from 'xlsx'

interface SelectableDataTableProps {
  data: any[]
  columns: string[]
  title?: string
  enableExport?: boolean
  onSelectionChange?: (selectedRows: any[]) => void
  generatedPitches?: Map<number, { pitch: string; status: string; generatedAt: string }>
  onPreviewPitch?: (rowIndex: number, pitch: string) => void
}

export default function SelectableDataTable({ 
  data, 
  columns: columnNames, 
  title = 'Data Table',
  enableExport = true,
  onSelectionChange,
  generatedPitches = new Map(),
  onPreviewPitch
}: SelectableDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Notify parent of selection changes
  useEffect(() => {
    if (onSelectionChange) {
      const selectedIndices = Object.keys(rowSelection)
        .filter(key => rowSelection[key])
        .map(key => parseInt(key))
      const selectedRows = selectedIndices.map(index => data[index])
      onSelectionChange(selectedRows)
    }
  }, [rowSelection, data, onSelectionChange])

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <button
            className="flex items-center justify-center p-1"
            onClick={() => table.toggleAllRowsSelected()}
          >
            {table.getIsAllRowsSelected() ? (
              <CheckSquare className="h-4 w-4 text-emerald-500" />
            ) : (
              <Square className="h-4 w-4 text-gray-400" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <button
            className="flex items-center justify-center p-1"
            onClick={() => row.toggleSelected()}
          >
            {row.getIsSelected() ? (
              <CheckSquare className="h-4 w-4 text-emerald-500" />
            ) : (
              <Square className="h-4 w-4 text-gray-400" />
            )}
          </button>
        ),
        size: 40
      },
      ...columnNames.map((columnName) => ({
        accessorKey: columnName,
        header: ({ column }: any) => {
          return (
            <button
              className="flex items-center space-x-1 font-medium text-white"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              <span>{columnName}</span>
              {column.getIsSorted() === 'asc' ? (
                <ChevronUp className="h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <div className="h-4 w-4" />
              )}
            </button>
          )
        },
        cell: ({ getValue }: any) => {
          const value = getValue()
          const stringValue = value !== null && value !== undefined ? String(value) : ''
          return (
            <div className="text-gray-300 truncate max-w-[200px]" title={stringValue}>
              {stringValue}
            </div>
          )
        }
      })),
      // Add pitch column if pitches exist
      ...(generatedPitches.size > 0 ? [{
        id: 'pitch',
        header: 'Generated Pitch',
        cell: ({ row }: any) => {
          const pitchData = generatedPitches.get(row.index)
          if (!pitchData) return <span className="text-gray-500">-</span>
          
          return (
            <div className="flex items-center space-x-2">
              <span className={`px-1.5 py-0.5 text-xs rounded ${
                pitchData.status === 'sent' 
                  ? 'bg-green-900/30 text-green-400'
                  : pitchData.status === 'failed'
                  ? 'bg-red-900/30 text-red-400'
                  : 'bg-dark-200 text-gray-400'
              }`}>
                {pitchData.status}
              </span>
              {onPreviewPitch && (
                <button
                  onClick={() => onPreviewPitch(row.index, pitchData.pitch)}
                  className="p-1 hover:bg-gray-800 rounded"
                >
                  <Eye className="h-4 w-4 text-emerald-500" />
                </button>
              )}
            </div>
          )
        }
      }] : [])
    ],
    [columnNames, rowSelection, generatedPitches, onPreviewPitch]
  )

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true
  })

  const exportToExcel = () => {
    const exportData = data.map((row, index) => {
      const pitchData = generatedPitches.get(index)
      return {
        ...row,
        ...(pitchData ? {
          'Generated Pitch': pitchData.pitch,
          'Pitch Status': pitchData.status,
          'Generated At': pitchData.generatedAt
        } : {})
      }
    })

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Data with Pitches')
    
    // Add original data sheet
    const wsOriginal = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, wsOriginal, 'Original Data')
    
    XLSX.writeFile(wb, `${title.replace(/\s+/g, '_')}_with_pitches.xlsx`)
  }

  const selectedCount = Object.keys(rowSelection).filter(key => rowSelection[key]).length

  return (
    <div className="w-full">
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {selectedCount > 0 && (
            <span className="px-3 py-1 bg-emerald-900/30 text-emerald-400 rounded-full text-sm">
              {selectedCount} selected
            </span>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search..."
              className="pl-10 pr-4 py-1.5 bg-dark-200 border border-dark-border rounded-md text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          {enableExport && (
            <button
              onClick={exportToExcel}
              className="px-3 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 flex items-center text-sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Export {generatedPitches.size > 0 ? 'with Pitches' : ''}
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto bg-dark-300 rounded-lg border border-dark-border">
        <table className="min-w-full divide-y divide-dark-border">
          <thead className="bg-dark-200">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-2 py-1.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-dark-border">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={`hover:bg-dark-200/50 ${
                  row.getIsSelected() ? 'bg-brand/10' : ''
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-2 py-1 text-xs whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="px-2 py-1 bg-dark-200 text-gray-300 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-100"
          >
            First
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-2 py-1 bg-dark-200 text-gray-300 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-100"
          >
            Previous
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-2 py-1 bg-dark-200 text-gray-300 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-100"
          >
            Next
          </button>
          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="px-2 py-1 bg-dark-200 text-gray-300 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-100"
          >
            Last
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-400">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="px-2 py-1 bg-dark-200 border border-dark-border rounded text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand"
          >
            {[10, 20, 30, 40, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                Show {pageSize}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}