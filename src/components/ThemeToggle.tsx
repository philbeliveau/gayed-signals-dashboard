'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="group relative p-3 bg-theme-card border border-theme-border rounded-xl hover:bg-theme-card-hover hover:border-theme-border-hover transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-theme-accent focus:ring-offset-2 focus:ring-offset-theme-bg"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      <div className="relative w-6 h-6 overflow-hidden">
        {/* Sun Icon */}
        <Sun 
          className={`absolute inset-0 w-6 h-6 text-amber-500 transition-all duration-500 transform ${
            theme === 'light' 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 rotate-90 scale-75'
          }`}
        />
        
        {/* Moon Icon */}
        <Moon 
          className={`absolute inset-0 w-6 h-6 text-slate-400 transition-all duration-500 transform ${
            theme === 'dark' 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 -rotate-90 scale-75'
          }`}
        />
      </div>
      
      {/* Hover tooltip */}
      <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 bg-theme-card border border-theme-border rounded-lg px-3 py-1 text-xs text-theme-text opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-50">
        {theme === 'light' ? 'Switch to dark' : 'Switch to light'}
        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-theme-card border-l border-t border-theme-border rotate-45"></div>
      </div>
    </button>
  );
};

export default ThemeToggle;