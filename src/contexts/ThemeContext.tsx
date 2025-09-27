'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Initialize with a default theme that matches the expected server render
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  // First useEffect: Mark as mounted and load saved preferences
  useEffect(() => {
    setMounted(true);
    
    // Function to safely access browser APIs
    const loadThemePreference = () => {
      try {
        // Check if there's a saved theme preference
        const savedTheme = localStorage.getItem('gayed-dashboard-theme') as Theme;
        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
          setTheme(savedTheme);
          return;
        }
        
        // Default to light theme to match reference design
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          setTheme('dark');
        } else {
          setTheme('light');
        }
      } catch (error) {
        // Fallback to light theme if any errors occur
        console.warn('Error loading theme preference:', error);
        setTheme('light');
      }
    };

    loadThemePreference();
  }, []);

  // Second useEffect: Apply theme changes to DOM (only after mounted)
  useEffect(() => {
    if (!mounted) return;

    try {
      // Save to localStorage
      localStorage.setItem('gayed-dashboard-theme', theme);
      
      // Update document class for global styling
      if (document.documentElement) {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);
      }
      
      // Update meta theme-color for mobile browsers
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', theme === 'light' ? '#f4f6f8' : '#1a1a1a');
      }
    } catch (error) {
      console.warn('Error applying theme changes:', error);
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const value = {
    theme,
    toggleTheme,
    setTheme,
  };

  // During SSR and initial hydration, render with a stable theme
  // This prevents hydration mismatches
  return (
    <ThemeContext.Provider value={value}>
      <div suppressHydrationWarning={!mounted} style={{ display: 'contents' }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};