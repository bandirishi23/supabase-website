import { useState, useCallback } from 'react'
import * as XLSX from 'xlsx'

export interface ParsedData {
  headers: string[]
  rows: any[][]
  rawData: any[]
}

export interface ColumnInfo {
  name: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'mixed'
  sampleValues: any[]
  nullCount: number
  uniqueCount: number
}

export function useExcelParser() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const detectColumnType = (values: any[]): ColumnInfo['type'] => {
    const types = new Set<string>()
    
    values.forEach(value => {
      if (value === null || value === undefined || value === '') return
      
      if (typeof value === 'boolean') {
        types.add('boolean')
      } else if (typeof value === 'number' && !isNaN(value)) {
        types.add('number')
      } else if (value instanceof Date) {
        types.add('date')
      } else {
        const str = String(value).trim()
        // Check if it's a date string
        if (/^\d{4}-\d{2}-\d{2}/.test(str) || /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(str)) {
          types.add('date')
        } else if (/^-?\d+(\.\d+)?$/.test(str)) {
          types.add('number')
        } else if (str.toLowerCase() === 'true' || str.toLowerCase() === 'false') {
          types.add('boolean')
        } else {
          types.add('string')
        }
      }
    })

    if (types.size === 0) return 'string'
    if (types.size === 1) return Array.from(types)[0] as ColumnInfo['type']
    return 'mixed'
  }

  const analyzeColumns = (headers: string[], data: any[]): ColumnInfo[] => {
    return headers.map((header, index) => {
      const columnValues = data.map(row => row[header] || row[index])
      const nonNullValues = columnValues.filter(v => v !== null && v !== undefined && v !== '')
      const uniqueValues = new Set(nonNullValues)
      
      return {
        name: header,
        type: detectColumnType(nonNullValues),
        sampleValues: nonNullValues.slice(0, 5),
        nullCount: columnValues.length - nonNullValues.length,
        uniqueCount: uniqueValues.size
      }
    })
  }

  const parseFile = useCallback(async (file: File): Promise<{ 
    data: ParsedData, 
    columnInfo: ColumnInfo[] 
  } | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { 
        type: 'array',
        cellDates: true,
        cellNF: false,
        cellText: false
      })
      
      // Get the first worksheet
      const worksheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[worksheetName]
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: null,
        blankrows: false
      }) as any[][]
      
      if (jsonData.length === 0) {
        throw new Error('The file appears to be empty')
      }
      
      // Extract headers and rows
      const headers = jsonData[0].map(h => String(h || `Column ${jsonData[0].indexOf(h) + 1}`))
      const rows = jsonData.slice(1)
      
      // Convert to object format for easier manipulation
      const rawData = rows.map(row => {
        const obj: any = {}
        headers.forEach((header, index) => {
          obj[header] = row[index] !== undefined ? row[index] : null
        })
        return obj
      })
      
      const columnInfo = analyzeColumns(headers, rawData)
      
      setIsLoading(false)
      return {
        data: {
          headers,
          rows,
          rawData
        },
        columnInfo
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error parsing file')
      setIsLoading(false)
      return null
    }
  }, [])

  return {
    parseFile,
    isLoading,
    error
  }
}