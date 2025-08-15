import { CleaningOptions } from '../components/data-import/CleaningOptions'
import { format, parse, isValid } from 'date-fns'

export function cleanData(
  data: any[],
  selectedColumns: string[],
  options: CleaningOptions
): any[] {
  let cleanedData = [...data]

  // Remove empty rows
  if (options.removeEmptyRows) {
    cleanedData = cleanedData.filter(row => {
      return selectedColumns.some(col => {
        const value = row[col]
        return value !== null && value !== undefined && value !== ''
      })
    })
  }

  // Remove duplicates
  if (options.removeDuplicates) {
    const seen = new Set<string>()
    cleanedData = cleanedData.filter(row => {
      const key = selectedColumns.map(col => JSON.stringify(row[col])).join('|')
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  // Apply column-specific cleaning
  cleanedData = cleanedData.map(row => {
    const cleanedRow = { ...row }
    
    selectedColumns.forEach(col => {
      let value = cleanedRow[col]
      
      if (value === null || value === undefined) {
        return
      }

      // Trim whitespace for strings
      if (typeof value === 'string' && options.trimWhitespace) {
        value = value.trim()
      }

      // Text case conversion
      if (typeof value === 'string') {
        if (options.lowercaseText) {
          value = value.toLowerCase()
        } else if (options.uppercaseText) {
          value = value.toUpperCase()
        } else if (options.titleCaseText) {
          value = toTitleCase(value)
        }
      }

      // Parse numbers
      if (options.parseNumbers && typeof value === 'string') {
        const trimmed = value.trim()
        if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
          const parsed = parseFloat(trimmed)
          if (!isNaN(parsed)) {
            value = parsed
          }
        }
      }

      // Convert dates
      if (options.convertDates && typeof value === 'string') {
        const dateValue = tryParseDate(value)
        if (dateValue) {
          value = dateValue
        }
      }

      cleanedRow[col] = value
    })
    
    return cleanedRow
  })

  return cleanedData
}

function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  })
}

function tryParseDate(value: string): Date | null {
  const dateFormats = [
    'yyyy-MM-dd',
    'MM/dd/yyyy',
    'dd/MM/yyyy',
    'yyyy/MM/dd',
    'MM-dd-yyyy',
    'dd-MM-yyyy',
    'MMM dd, yyyy',
    'dd MMM yyyy',
    'yyyy-MM-dd HH:mm:ss',
    'MM/dd/yyyy HH:mm:ss'
  ]

  for (const format of dateFormats) {
    try {
      const parsed = parse(value, format, new Date())
      if (isValid(parsed)) {
        return parsed
      }
    } catch {
      continue
    }
  }

  // Try native Date parsing as fallback
  const nativeDate = new Date(value)
  if (isValid(nativeDate) && !isNaN(nativeDate.getTime())) {
    return nativeDate
  }

  return null
}

export function prepareDataForSupabase(
  data: any[],
  selectedColumns: string[],
  datasetId: string
): any[] {
  return data.map((row, index) => {
    const rowData: any = {}
    selectedColumns.forEach(col => {
      rowData[col] = row[col]
    })
    
    return {
      dataset_id: datasetId,
      row_index: index,
      row_data: rowData
    }
  })
}

export function generateColumnMappings(
  columns: string[],
  columnInfo: any[]
): any {
  const mappings: any = {}
  
  columns.forEach(col => {
    const info = columnInfo.find(c => c.name === col)
    if (info) {
      mappings[col] = {
        type: info.type,
        originalName: col
      }
    }
  })
  
  return mappings
}