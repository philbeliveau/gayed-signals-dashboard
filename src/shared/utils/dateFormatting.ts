/**
 * Date Formatting Utilities
 * 
 * Centralized date formatting to ensure consistency across all components
 * and prevent hydration mismatches caused by different date formatting approaches.
 */

export type DateFormatStyle = 'chart' | 'display' | 'iso' | 'short' | 'long' | 'api';

/**
 * Format date consistently for different use cases
 */
export function formatDate(date: string | Date | number, style: DateFormatStyle = 'display'): string {
  let dateObj: Date;
  
  // Handle different input types safely
  try {
    if (typeof date === 'string') {
      // Handle ISO strings, assume UTC if no timezone specified
      dateObj = new Date(date.includes('T') ? date : `${date}T00:00:00.000Z`);
    } else if (typeof date === 'number') {
      dateObj = new Date(date);
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      throw new Error('Invalid date input');
    }
    
    // Validate the date
    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid date value');
    }
  } catch (error) {
    console.warn('Date formatting error:', error, 'Input:', date);
    return 'Invalid Date';
  }

  // Format based on style
  switch (style) {
    case 'iso':
      return dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
      
    case 'chart':
      // Optimized for chart tick labels - short and readable
      return dateObj.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: '2-digit'
      });
      
    case 'display':
      // Human-readable display
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
    case 'short':
      // Compact format
      return dateObj.toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: '2-digit'
      });
      
    case 'long':
      // Full format with day name
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
    case 'api':
      // Consistent API format
      return dateObj.toISOString();
      
    default:
      return dateObj.toLocaleDateString('en-US');
  }
}

/**
 * Parse date string consistently
 */
export function parseDate(dateStr: string): Date | null {
  try {
    // Handle common date formats
    let normalized = dateStr;
    
    // If just YYYY-MM-DD, add time component for consistent parsing
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      normalized = `${dateStr}T00:00:00.000Z`;
    }
    
    const date = new Date(normalized);
    
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return date;
  } catch (error) {
    console.warn('Date parsing error:', error, 'Input:', dateStr);
    return null;
  }
}

/**
 * Generate date range for charts/analysis
 */
export function generateDateRange(startDate: string, endDate: string, intervalDays: number = 1): string[] {
  const dates: string[] = [];
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  
  if (!start || !end) {
    console.warn('Invalid date range:', startDate, endDate);
    return [];
  }
  
  const current = new Date(start);
  
  while (current <= end) {
    dates.push(formatDate(current, 'iso'));
    current.setDate(current.getDate() + intervalDays);
  }
  
  return dates;
}

/**
 * Check if date is valid business day (Mon-Fri)
 */
export function isBusinessDay(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? parseDate(date) : date;
  if (!dateObj) return false;
  
  const dayOfWeek = dateObj.getDay();
  return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday = 1, Friday = 5
}

/**
 * Get business days in range (excludes weekends)
 */
export function getBusinessDays(startDate: string, endDate: string): string[] {
  return generateDateRange(startDate, endDate)
    .filter(date => isBusinessDay(date));
}

/**
 * Compare dates safely
 */
export function compareDates(date1: string | Date, date2: string | Date): number {
  const d1 = typeof date1 === 'string' ? parseDate(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseDate(date2) : date2;
  
  if (!d1 || !d2) return 0;
  
  return d1.getTime() - d2.getTime();
}

/**
 * Format date for tooltip display with time zone handling
 */
export function formatTooltipDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseDate(date) : date;
  if (!dateObj) return 'Invalid Date';
  
  return dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Calculate days between dates
 */
export function daysBetween(startDate: string | Date, endDate: string | Date): number {
  const start = typeof startDate === 'string' ? parseDate(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseDate(endDate) : endDate;
  
  if (!start || !end) return 0;
  
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get current date in consistent format
 */
export function getCurrentDate(style: DateFormatStyle = 'iso'): string {
  return formatDate(new Date(), style);
}

/**
 * Validate date range
 */
export function validateDateRange(startDate: string, endDate: string): {
  valid: boolean;
  error?: string;
} {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  
  if (!start) {
    return { valid: false, error: 'Invalid start date' };
  }
  
  if (!end) {
    return { valid: false, error: 'Invalid end date' };
  }
  
  if (start >= end) {
    return { valid: false, error: 'Start date must be before end date' };
  }
  
  return { valid: true };
}