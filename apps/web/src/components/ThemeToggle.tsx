'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="group relative flex items-center px-2 py-2 bg-theme-primary/10 hover:bg-theme-primary/20 border border-theme-primary/20 hover:border-theme-primary/30 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      {/* Toggle Track */}
      <div className="relative w-11 h-6 bg-theme-border rounded-full transition-colors duration-200">
        {/* Toggle Slider */}
        <div
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-theme-card rounded-full shadow-sm transition-all duration-200 flex items-center justify-center ${
            theme === 'dark' ? 'translate-x-5 bg-theme-primary' : 'translate-x-0'
          }`}
        >
          {/* Icon inside slider */}
          {theme === 'light' ? (
            <Sun className="w-3 h-3 text-amber-500" />
          ) : (
            <Moon className="w-3 h-3 text-white" />
          )}
        </div>
      </div>
    </button>
  );
};

export default ThemeToggle;