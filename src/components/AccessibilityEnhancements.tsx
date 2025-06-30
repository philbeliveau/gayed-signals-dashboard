'use client';

import { useEffect, useRef, useState } from 'react';
import { Keyboard, Eye, Volume2 } from 'lucide-react';

// =============================================================================
// KEYBOARD NAVIGATION HOOK
// =============================================================================

export interface UseKeyboardNavigationProps {
  onEnter?: () => void;
  onEscape?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onTab?: (shiftKey: boolean) => void;
  disabled?: boolean;
}

export function useKeyboardNavigation({
  onEnter,
  onEscape,
  onArrowUp,
  onArrowDown,
  onArrowLeft,
  onArrowRight,
  onTab,
  disabled = false
}: UseKeyboardNavigationProps) {
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Enter':
          onEnter?.();
          break;
        case 'Escape':
          onEscape?.();
          break;
        case 'ArrowUp':
          event.preventDefault();
          onArrowUp?.();
          break;
        case 'ArrowDown':
          event.preventDefault();
          onArrowDown?.();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          onArrowLeft?.();
          break;
        case 'ArrowRight':
          event.preventDefault();
          onArrowRight?.();
          break;
        case 'Tab':
          onTab?.(event.shiftKey);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onEnter, onEscape, onArrowUp, onArrowDown, onArrowLeft, onArrowRight, onTab, disabled]);
}

// =============================================================================
// FOCUS MANAGEMENT HOOK
// =============================================================================

export function useFocusManagement() {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const focusableElements = useRef<HTMLElement[]>([]);

  const registerFocusableElement = (element: HTMLElement | null) => {
    if (element && !focusableElements.current.includes(element)) {
      focusableElements.current.push(element);
    }
  };

  const focusNext = () => {
    const nextIndex = (focusedIndex + 1) % focusableElements.current.length;
    setFocusedIndex(nextIndex);
    focusableElements.current[nextIndex]?.focus();
  };

  const focusPrevious = () => {
    const prevIndex = focusedIndex === 0 ? focusableElements.current.length - 1 : focusedIndex - 1;
    setFocusedIndex(prevIndex);
    focusableElements.current[prevIndex]?.focus();
  };

  const focusFirst = () => {
    setFocusedIndex(0);
    focusableElements.current[0]?.focus();
  };

  const focusLast = () => {
    const lastIndex = focusableElements.current.length - 1;
    setFocusedIndex(lastIndex);
    focusableElements.current[lastIndex]?.focus();
  };

  const resetFocus = () => {
    setFocusedIndex(-1);
    focusableElements.current = [];
  };

  return {
    focusedIndex,
    registerFocusableElement,
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    resetFocus
  };
}

// =============================================================================
// SCREEN READER ANNOUNCEMENTS
// =============================================================================

export function useScreenReader() {
  const announcementRef = useRef<HTMLDivElement>(null);

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announcementRef.current) {
      announcementRef.current.setAttribute('aria-live', priority);
      announcementRef.current.textContent = message;
      
      // Clear after announcement to avoid repetition
      setTimeout(() => {
        if (announcementRef.current) {
          announcementRef.current.textContent = '';
        }
      }, 1000);
    }
  };

  const announceData = (data: { label: string; value: string | number; change?: number }) => {
    let message = `${data.label}: ${data.value}`;
    if (data.change !== undefined) {
      const changeText = data.change > 0 ? 'increased' : data.change < 0 ? 'decreased' : 'unchanged';
      message += `, ${changeText} by ${Math.abs(data.change)}%`;
    }
    announce(message);
  };

  const announceAlert = (alert: { type: string; message: string; severity: string }) => {
    const message = `${alert.severity} ${alert.type}: ${alert.message}`;
    announce(message, 'assertive');
  };

  const ScreenReaderAnnouncements = () => (
    <div
      ref={announcementRef}
      className="sr-only"
      aria-live="polite"
      aria-atomic="true"
    />
  );

  return {
    announce,
    announceData,
    announceAlert,
    ScreenReaderAnnouncements
  };
}

// =============================================================================
// ACCESSIBLE DATA TABLE
// =============================================================================

export interface AccessibleDataTableProps {
  data: Record<string, any>[];
  columns: {
    key: string;
    label: string;
    sortable?: boolean;
    format?: (value: any) => string;
  }[];
  caption: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onRowSelect?: (row: Record<string, any>, index: number) => void;
  selectedRows?: number[];
  loading?: boolean;
}

export const AccessibleDataTable: React.FC<AccessibleDataTableProps> = ({
  data,
  columns,
  caption,
  sortBy,
  sortDirection = 'asc',
  onSort,
  onRowSelect,
  selectedRows = [],
  loading = false
}) => {
  const tableRef = useRef<HTMLTableElement>(null);
  const { announce } = useScreenReader();

  const handleSort = (columnKey: string) => {
    if (!onSort) return;
    
    const newDirection = sortBy === columnKey && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(columnKey, newDirection);
    
    const column = columns.find(col => col.key === columnKey);
    announce(`Table sorted by ${column?.label} in ${newDirection}ending order`);
  };

  const handleRowClick = (row: Record<string, any>, index: number) => {
    if (onRowSelect) {
      onRowSelect(row, index);
      announce(`Row ${index + 1} selected`);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, row: Record<string, any>, index: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleRowClick(row, index);
    }
  };

  if (loading) {
    return (
      <div className="bg-theme-card border border-theme-border rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-theme-bg-secondary rounded mb-4 w-48"></div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-theme-bg-secondary rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-theme-card border border-theme-border rounded-xl overflow-hidden">
      <table
        ref={tableRef}
        className="w-full"
        role="table"
        aria-label={caption}
      >
        <caption className="sr-only">{caption}</caption>
        
        <thead className="bg-theme-bg-secondary">
          <tr role="row">
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-4 py-3 text-left text-xs font-medium text-theme-text-muted uppercase tracking-wide"
                scope="col"
                role="columnheader"
                aria-sort={
                  sortBy === column.key 
                    ? sortDirection === 'asc' ? 'ascending' : 'descending'
                    : 'none'
                }
              >
                {column.sortable ? (
                  <button
                    onClick={() => handleSort(column.key)}
                    className="flex items-center gap-1 hover:text-theme-text focus:text-theme-text focus:outline-none"
                    aria-label={`Sort by ${column.label}`}
                  >
                    {column.label}
                    {sortBy === column.key && (
                      <span className="text-theme-primary">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        
        <tbody>
          {data.map((row, index) => (
            <tr
              key={index}
              className={`border-t border-theme-border hover:bg-theme-card-hover transition-colors ${
                selectedRows.includes(index) ? 'bg-theme-primary/10' : ''
              } ${onRowSelect ? 'cursor-pointer' : ''}`}
              role="row"
              tabIndex={onRowSelect ? 0 : -1}
              onClick={() => handleRowClick(row, index)}
              onKeyDown={(e) => handleKeyDown(e, row, index)}
              aria-selected={selectedRows.includes(index)}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className="px-4 py-3 text-sm text-theme-text"
                  role="cell"
                >
                  {column.format ? column.format(row[column.key]) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      {data.length === 0 && (
        <div className="p-8 text-center text-theme-text-muted">
          <div className="text-lg mb-2">No data available</div>
          <div className="text-sm">Try adjusting your filters or check back later</div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// ACCESSIBLE CHART WRAPPER
// =============================================================================

export interface AccessibleChartWrapperProps {
  title: string;
  description: string;
  data: Array<Record<string, any>>;
  xAxisLabel?: string;
  yAxisLabel?: string;
  children: React.ReactNode;
  loading?: boolean;
  error?: string;
}

export const AccessibleChartWrapper: React.FC<AccessibleChartWrapperProps> = ({
  title,
  description,
  data,
  xAxisLabel,
  yAxisLabel,
  children,
  loading = false,
  error
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const { announce } = useScreenReader();

  useEffect(() => {
    if (data.length > 0) {
      const dataPoint = data[data.length - 1];
      const keys = Object.keys(dataPoint).filter(key => typeof dataPoint[key] === 'number');
      if (keys.length > 0) {
        const latestValue = dataPoint[keys[0]];
        announce(`Chart updated. Latest ${keys[0]}: ${latestValue}`);
      }
    }
  }, [data, announce]);

  const generateDataSummary = () => {
    if (data.length === 0) return 'No data available';
    
    const summary = [];
    summary.push(`Chart contains ${data.length} data points`);
    
    if (xAxisLabel) summary.push(`X-axis: ${xAxisLabel}`);
    if (yAxisLabel) summary.push(`Y-axis: ${yAxisLabel}`);
    
    const firstPoint = data[0];
    const lastPoint = data[data.length - 1];
    const numericKeys = Object.keys(firstPoint).filter(key => typeof firstPoint[key] === 'number');
    
    if (numericKeys.length > 0) {
      const key = numericKeys[0];
      summary.push(`Range from ${firstPoint[key]} to ${lastPoint[key]}`);
    }
    
    return summary.join('. ');
  };

  if (loading) {
    return (
      <div className="bg-theme-card border border-theme-border rounded-xl p-6">
        <div className="h-4 bg-theme-bg-secondary rounded mb-4 w-48 animate-pulse"></div>
        <div className="h-64 bg-theme-bg-secondary rounded animate-pulse"></div>
        <div className="sr-only">Chart is loading</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-theme-card border border-theme-border rounded-xl p-6">
        <div className="text-center py-8">
          <div className="text-theme-danger text-xl mb-2">⚠</div>
          <div className="text-theme-danger font-medium mb-2">Chart Error</div>
          <div className="text-theme-text-muted text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-theme-card border border-theme-border rounded-xl p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-theme-text">{title}</h3>
        <p className="text-sm text-theme-text-muted mt-1">{description}</p>
      </div>
      
      <div
        ref={chartRef}
        role="img"
        aria-label={`${title}. ${description}`}
        aria-describedby="chart-summary"
        tabIndex={0}
        className="focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2 rounded"
      >
        {children}
      </div>
      
      <div id="chart-summary" className="sr-only">
        {generateDataSummary()}
      </div>
      
      <div className="mt-4 text-xs text-theme-text-muted">
        Press Tab to navigate to chart. Use arrow keys when focused to explore data points.
      </div>
    </div>
  );
};

// =============================================================================
// ACCESSIBILITY PREFERENCES
// =============================================================================

export interface AccessibilityPreferences {
  reduceMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  screenReader: boolean;
}

export function useAccessibilityPreferences() {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>({
    reduceMotion: false,
    highContrast: false,
    largeText: false,
    screenReader: false
  });

  useEffect(() => {
    // Check system preferences
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const highContrast = window.matchMedia('(prefers-contrast: high)').matches;
    
    setPreferences(prev => ({
      ...prev,
      reduceMotion,
      highContrast
    }));

    // Apply CSS classes based on preferences
    const root = document.documentElement;
    if (reduceMotion) root.classList.add('reduce-motion');
    if (highContrast) root.classList.add('high-contrast');
    
    return () => {
      root.classList.remove('reduce-motion', 'high-contrast');
    };
  }, []);

  const updatePreference = (key: keyof AccessibilityPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    
    // Apply changes to DOM
    const root = document.documentElement;
    if (key === 'reduceMotion') {
      root.classList.toggle('reduce-motion', value);
    } else if (key === 'highContrast') {
      root.classList.toggle('high-contrast', value);
    } else if (key === 'largeText') {
      root.classList.toggle('large-text', value);
    }
  };

  return { preferences, updatePreference };
}

// =============================================================================
// ACCESSIBILITY MENU COMPONENT
// =============================================================================

export const AccessibilityMenu: React.FC = () => {
  const { preferences, updatePreference } = useAccessibilityPreferences();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg border border-theme-border hover:bg-theme-card-hover focus:outline-none focus:ring-2 focus:ring-theme-primary"
        aria-label="Accessibility options"
        aria-expanded={isOpen}
      >
        <Eye className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-theme-card border border-theme-border rounded-lg shadow-xl z-50">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-theme-text mb-3">Accessibility</h3>
            
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-sm text-theme-text">Reduce motion</span>
                <input
                  type="checkbox"
                  checked={preferences.reduceMotion}
                  onChange={(e) => updatePreference('reduceMotion', e.target.checked)}
                  className="rounded border-theme-border"
                />
              </label>
              
              <label className="flex items-center justify-between">
                <span className="text-sm text-theme-text">High contrast</span>
                <input
                  type="checkbox"
                  checked={preferences.highContrast}
                  onChange={(e) => updatePreference('highContrast', e.target.checked)}
                  className="rounded border-theme-border"
                />
              </label>
              
              <label className="flex items-center justify-between">
                <span className="text-sm text-theme-text">Large text</span>
                <input
                  type="checkbox"
                  checked={preferences.largeText}
                  onChange={(e) => updatePreference('largeText', e.target.checked)}
                  className="rounded border-theme-border"
                />
              </label>
              
              <label className="flex items-center justify-between">
                <span className="text-sm text-theme-text">Screen reader mode</span>
                <input
                  type="checkbox"
                  checked={preferences.screenReader}
                  onChange={(e) => updatePreference('screenReader', e.target.checked)}
                  className="rounded border-theme-border"
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Note: All exports are already declared inline above