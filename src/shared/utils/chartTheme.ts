'use client';

import { useEffect, useState } from 'react';

export interface ChartTheme {
  primary: string;
  secondary: string;
  success: string;
  danger: string;
  warning: string;
  info: string;
  accent: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textLight: string;
  border: string;
  card: string;
  bg: string;
  grid: string;
}

/**
 * Get chart theme colors from CSS custom properties
 * Provides fallback values for when CSS variables aren't available
 */
export const getChartTheme = (): ChartTheme => {
  if (typeof window === 'undefined') {
    // Server-side fallback (dark theme defaults)
    return {
      primary: '#8B5CF6',
      secondary: '#A78BFA',
      success: '#10B981',
      danger: '#F87171',
      warning: '#FBBF24',
      info: '#60A5FA',
      accent: '#8B5CF6',
      text: '#FFFFFF',
      textSecondary: '#E2E8F0',
      textMuted: '#94A3B8',
      textLight: '#64748B',
      border: 'rgba(255,255,255,0.1)',
      card: '#1A1A1A',
      bg: '#0A0A0A',
      grid: 'rgba(139, 92, 246, 0.08)'
    };
  }

  const style = getComputedStyle(document.documentElement);
  
  const getColor = (varName: string, fallback: string): string => {
    const value = style.getPropertyValue(varName).trim();
    return value || fallback;
  };

  return {
    primary: getColor('--theme-primary', '#8B5CF6'),
    secondary: getColor('--theme-primary-light', '#A78BFA'),
    success: getColor('--theme-success', '#10B981'),
    danger: getColor('--theme-danger', '#F87171'),
    warning: getColor('--theme-warning', '#FBBF24'),
    info: getColor('--theme-info', '#60A5FA'),
    accent: getColor('--theme-accent', '#8B5CF6'),
    text: getColor('--theme-text', '#FFFFFF'),
    textSecondary: getColor('--theme-text-secondary', '#E2E8F0'),
    textMuted: getColor('--theme-text-muted', '#94A3B8'),
    textLight: getColor('--theme-text-light', '#64748B'),
    border: getColor('--theme-border', 'rgba(255,255,255,0.1)'),
    card: getColor('--theme-card', '#1A1A1A'),
    bg: getColor('--theme-bg', '#0A0A0A'),
    grid: getColor('--theme-grid', 'rgba(139, 92, 246, 0.08)')
  };
};

/**
 * React hook to get and reactively update chart colors
 * Automatically updates when theme changes
 */
export const useChartColors = (): ChartTheme => {
  const [colors, setColors] = useState<ChartTheme>(getChartTheme);
  
  useEffect(() => {
    const updateColors = () => {
      setColors(getChartTheme());
    };

    // Initial update
    updateColors();
    
    // Watch for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          (mutation.attributeName === 'class' || 
           mutation.attributeName === 'data-theme')
        ) {
          updateColors();
        }
      });
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme']
    });
    
    // Also listen for custom theme change events
    const handleThemeChange = () => updateColors();
    window.addEventListener('themechange', handleThemeChange);
    
    return () => {
      observer.disconnect();
      window.removeEventListener('themechange', handleThemeChange);
    };
  }, []);
  
  return colors;
};

/**
 * Get colors optimized for Recharts SVG elements
 * Some chart libraries need hex colors instead of CSS variables
 */
export const getRechartsColors = (theme?: ChartTheme) => {
  const colors = theme || getChartTheme();
  
  return {
    // Line/Area colors
    line1: colors.primary,
    line2: colors.secondary,
    line3: colors.info,
    line4: colors.warning,
    line5: colors.success,
    
    // Status colors
    positive: colors.success,
    negative: colors.danger,
    neutral: colors.warning,
    
    // UI colors
    grid: colors.grid,
    axis: colors.textMuted,
    text: colors.textMuted,
    tooltip: {
      background: colors.card,
      border: colors.border,
      text: colors.text
    },
    
    // Reference lines
    reference: colors.textLight,
    
    // Risk indicators
    riskOn: colors.success,
    riskOff: colors.danger
  };
};

/**
 * Utility to convert CSS color to hex if needed
 * Some chart libraries don't support rgba() or CSS variables
 */
export const normalizeChartColor = (color: string): string => {
  // If it's already a hex color, return as-is
  if (color.startsWith('#')) {
    return color;
  }
  
  // If it's a CSS variable, try to resolve it
  if (color.startsWith('var(')) {
    return getChartTheme().primary; // fallback
  }
  
  // If it's rgba/rgb, convert to hex (simplified)
  if (color.startsWith('rgba') || color.startsWith('rgb')) {
    // For now, return a fallback - full conversion would be more complex
    return '#8B5CF6';
  }
  
  return color;
};