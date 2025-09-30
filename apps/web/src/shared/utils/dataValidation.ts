/**
 * Data Validation Utilities
 * 
 * Centralized data validation and transformation to ensure consistency
 * across different data sources and prevent runtime errors from format mismatches.
 */

import { formatDate, parseDate } from './dateFormatting';

export interface ChartDataPoint {
  date: string;
  [key: string]: string | number | undefined;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  data?: unknown;
}

/**
 * Validate and normalize chart data
 */
export function validateChartData(
  data: unknown[],
  requiredFields: string[] = ['date'],
  options: {
    sortByDate?: boolean;
    removeDuplicates?: boolean;
    fillMissingDates?: boolean;
  } = {}
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Basic validation
  if (!Array.isArray(data)) {
    errors.push('Data must be an array');
    return { valid: false, errors, warnings };
  }
  
  if (data.length === 0) {
    errors.push('Data array is empty');
    return { valid: false, errors, warnings };
  }
  
  // Validate each data point
  const validatedData: ChartDataPoint[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const point = data[i];
    
    if (!point || typeof point !== 'object') {
      warnings.push(`Invalid data point at index ${i}: not an object`);
      continue;
    }
    
    // Check required fields
    const missingFields = requiredFields.filter(field => !(field in point));
    if (missingFields.length > 0) {
      warnings.push(`Missing required fields at index ${i}: ${missingFields.join(', ')}`);
      continue;
    }
    
    // Validate and normalize date
    if (point.date) {
      const normalizedDate = normalizeDate(point.date);
      if (!normalizedDate) {
        warnings.push(`Invalid date at index ${i}: ${point.date}`);
        continue;
      }
      point.date = normalizedDate;
    }
    
    // Validate numeric fields
    const numericFields = Object.keys(point).filter(key => 
      key !== 'date' && typeof point[key] === 'number'
    );
    
    for (const field of numericFields) {
      const value = point[field];
      if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
        warnings.push(`Invalid numeric value for ${field} at index ${i}: ${value}`);
        // Convert to null instead of removing the field
        point[field] = null;
      }
    }
    
    validatedData.push(point as ChartDataPoint);
  }
  
  if (validatedData.length === 0) {
    errors.push('No valid data points found after validation');
    return { valid: false, errors, warnings };
  }
  
  // Apply options
  let processedData = validatedData;
  
  if (options.sortByDate) {
    processedData = processedData.sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      if (!dateA || !dateB) return 0;
      return dateA.getTime() - dateB.getTime();
    });
  }
  
  if (options.removeDuplicates) {
    const seen = new Set();
    processedData = processedData.filter(point => {
      const key = point.date;
      if (seen.has(key)) {
        warnings.push(`Duplicate date removed: ${key}`);
        return false;
      }
      seen.add(key);
      return true;
    });
  }
  
  return {
    valid: true,
    errors,
    warnings,
    data: processedData
  };
}

/**
 * Normalize date to consistent format
 */
function normalizeDate(date: string | number | Date | unknown): string | null {
  if (typeof date === 'string') {
    const parsed = parseDate(date);
    return parsed ? formatDate(parsed, 'iso') : null;
  }
  
  if (date instanceof Date) {
    return formatDate(date, 'iso');
  }
  
  if (typeof date === 'number') {
    return formatDate(new Date(date), 'iso');
  }
  
  return null;
}

/**
 * Validate API response structure
 */
export function validateAPIResponse(
  response: unknown,
  expectedStructure: Record<string, string>
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!response || typeof response !== 'object') {
    errors.push('Response is not an object');
    return { valid: false, errors, warnings };
  }
  
  // Check for required fields
  for (const [field, type] of Object.entries(expectedStructure)) {
    if (!(field in response)) {
      errors.push(`Missing required field: ${field}`);
      continue;
    }
    
    const value = response[field];
    
    // Type checking
    switch (type) {
      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`Field ${field} must be an array, got ${typeof value}`);
        }
        break;
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`Field ${field} must be a string, got ${typeof value}`);
        }
        break;
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`Field ${field} must be a number, got ${typeof value}`);
        }
        break;
      case 'object':
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          errors.push(`Field ${field} must be an object, got ${typeof value}`);
        }
        break;
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    data: response
  };
}

/**
 * Transform data from different sources to consistent format
 */
export function transformDataSource(
  data: unknown, 
  sourceType: 'python' | 'api' | 'mock'
): ChartDataPoint[] {
  try {
    switch (sourceType) {
      case 'python':
        return transformPythonData(data);
      case 'api':
        return transformAPIData(data);
      case 'mock':
        return transformMockData(data);
      default:
        console.warn('Unknown data source type:', sourceType);
        return [];
    }
  } catch (error) {
    console.error('Data transformation error:', error);
    return [];
  }
}

/**
 * Transform Python service data
 */
function transformPythonData(data: unknown): ChartDataPoint[] {
  if (!data || !data.chartData) return [];
  
  const result = validateChartData(data.chartData, ['date'], {
    sortByDate: true,
    removeDuplicates: true
  });
  
  return result.valid ? result.data : [];
}

/**
 * Transform API data
 */
function transformAPIData(data: unknown): ChartDataPoint[] {
  if (!data || !Array.isArray(data)) return [];
  
  const result = validateChartData(data, ['date'], {
    sortByDate: true,
    removeDuplicates: true
  });
  
  return result.valid ? result.data : [];
}

/**
 * Transform mock data
 */
function transformMockData(data: unknown): ChartDataPoint[] {
  if (!Array.isArray(data)) return [];
  
  const result = validateChartData(data, ['date'], {
    sortByDate: true,
    removeDuplicates: true
  });
  
  return result.valid ? result.data : [];
}

/**
 * Validate signal data structure
 */
export function validateSignalData(signals: unknown[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!Array.isArray(signals)) {
    errors.push('Signals must be an array');
    return { valid: false, errors, warnings };
  }
  
  const validatedSignals = [];
  
  for (let i = 0; i < signals.length; i++) {
    const signal = signals[i];
    
    if (!signal || typeof signal !== 'object') {
      warnings.push(`Invalid signal at index ${i}: not an object`);
      continue;
    }
    
    // Required signal fields
    const requiredFields = ['type', 'signal', 'confidence'];
    const missingFields = requiredFields.filter(field => !(field in signal));
    
    if (missingFields.length > 0) {
      warnings.push(`Signal at index ${i} missing fields: ${missingFields.join(', ')}`);
      continue;
    }
    
    // Validate signal values
    if (!['Risk-On', 'Risk-Off', 'Neutral'].includes(signal.signal)) {
      warnings.push(`Invalid signal value at index ${i}: ${signal.signal}`);
      continue;
    }
    
    // Validate confidence
    if (typeof signal.confidence !== 'number' || signal.confidence < 0 || signal.confidence > 1) {
      warnings.push(`Invalid confidence at index ${i}: ${signal.confidence}`);
      continue;
    }
    
    validatedSignals.push(signal);
  }
  
  return {
    valid: validatedSignals.length > 0,
    errors,
    warnings,
    data: validatedSignals
  };
}

/**
 * Safe data access with defaults
 */
export function safeGet<T>(
  obj: Record<string, unknown>, 
  path: string, 
  defaultValue: T
): T {
  try {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined) {
        return defaultValue;
      }
      current = current[key];
    }
    
    return current !== undefined ? current : defaultValue;
  } catch (error) {
    console.warn('Safe get error:', error, 'Path:', path);
    return defaultValue;
  }
}

/**
 * Merge data from multiple sources with conflict resolution
 */
export function mergeDataSources(
  sources: Array<{ data: ChartDataPoint[]; priority: number; source: string }>,
  conflictResolution: 'highest' | 'lowest' | 'average' | 'latest' = 'latest'
): ChartDataPoint[] {
  const merged = new Map<string, ChartDataPoint>();
  
  // Sort sources by priority
  const sortedSources = sources.sort((a, b) => b.priority - a.priority);
  
  for (const { data, source } of sortedSources) {
    for (const point of data) {
      const key = point.date;
      
      if (!merged.has(key)) {
        merged.set(key, { ...point });
      } else {
        const existing = merged.get(key)!;
        
        // Merge numeric fields based on conflict resolution
        for (const [field, value] of Object.entries(point)) {
          if (field === 'date') continue;
          if (typeof value !== 'number') continue;
          
          const existingValue = existing[field];
          if (typeof existingValue !== 'number') {
            existing[field] = value;
            continue;
          }
          
          switch (conflictResolution) {
            case 'highest':
              existing[field] = Math.max(existingValue, value);
              break;
            case 'lowest':
              existing[field] = Math.min(existingValue, value);
              break;
            case 'average':
              existing[field] = (existingValue + value) / 2;
              break;
            case 'latest':
              existing[field] = value; // Use the later source's value
              break;
          }
        }
      }
    }
  }
  
  return Array.from(merged.values()).sort((a, b) => {
    const dateA = parseDate(a.date);
    const dateB = parseDate(b.date);
    if (!dateA || !dateB) return 0;
    return dateA.getTime() - dateB.getTime();
  });
}