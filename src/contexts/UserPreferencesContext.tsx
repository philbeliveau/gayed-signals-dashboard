'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface ETFSelection {
  symbol: string;
  selected: boolean;
  allocation: number; // Percentage allocation (0-100)
}

export interface StrategyPreferences {
  selectedETFs: Record<string, ETFSelection>; // ETF symbol -> selection info
  totalAllocation: number;
}

export interface UserPreferences {
  strategies: Record<string, StrategyPreferences>; // strategy type -> preferences
}

interface UserPreferencesContextType {
  preferences: UserPreferences;
  updateETFSelection: (strategyType: string, etfSymbol: string, selected: boolean) => void;
  updateETFAllocation: (strategyType: string, etfSymbol: string, allocation: number) => void;
  getSelectedETFs: (strategyType: string) => ETFSelection[];
  getTotalAllocation: (strategyType: string) => number;
  resetStrategy: (strategyType: string) => void;
  exportPreferences: () => string;
  importPreferences: (data: string) => boolean;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

const STORAGE_KEY = 'gayed-dashboard-user-preferences';

// Default ETF selections with equal allocations
const getDefaultStrategyPreferences = (etfSymbols: string[]): StrategyPreferences => {
  const allocation = etfSymbols.length > 0 ? Math.floor(100 / etfSymbols.length) : 0;
  const selectedETFs: Record<string, ETFSelection> = {};
  
  etfSymbols.forEach((symbol, index) => {
    selectedETFs[symbol] = {
      symbol,
      selected: index < 2, // Select first 2 ETFs by default
      allocation: index < 2 ? allocation : 0
    };
  });
  
  return {
    selectedETFs,
    totalAllocation: allocation * Math.min(2, etfSymbols.length)
  };
};

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>({
    strategies: {}
  });

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPreferences(parsed);
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }
  }, []);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save user preferences:', error);
    }
  }, [preferences]);

  const updateETFSelection = (strategyType: string, etfSymbol: string, selected: boolean) => {
    setPreferences(prev => {
      const strategy = prev.strategies[strategyType] || { selectedETFs: {}, totalAllocation: 0 };
      const etfSelection = strategy.selectedETFs[etfSymbol] || { 
        symbol: etfSymbol, 
        selected: false, 
        allocation: 0 
      };

      const updatedSelection = {
        ...etfSelection,
        selected
      };

      // If deselecting, set allocation to 0
      if (!selected) {
        updatedSelection.allocation = 0;
      }

      const updatedStrategy = {
        ...strategy,
        selectedETFs: {
          ...strategy.selectedETFs,
          [etfSymbol]: updatedSelection
        }
      };

      // Recalculate total allocation
      updatedStrategy.totalAllocation = Object.values(updatedStrategy.selectedETFs)
        .filter(etf => etf.selected)
        .reduce((total, etf) => total + etf.allocation, 0);

      return {
        ...prev,
        strategies: {
          ...prev.strategies,
          [strategyType]: updatedStrategy
        }
      };
    });
  };

  const updateETFAllocation = (strategyType: string, etfSymbol: string, allocation: number) => {
    setPreferences(prev => {
      const strategy = prev.strategies[strategyType] || { selectedETFs: {}, totalAllocation: 0 };
      const etfSelection = strategy.selectedETFs[etfSymbol] || { 
        symbol: etfSymbol, 
        selected: false, 
        allocation: 0 
      };

      const updatedSelection = {
        ...etfSelection,
        allocation: Math.max(0, Math.min(100, allocation)) // Clamp between 0-100
      };

      const updatedStrategy = {
        ...strategy,
        selectedETFs: {
          ...strategy.selectedETFs,
          [etfSymbol]: updatedSelection
        }
      };

      // Recalculate total allocation
      updatedStrategy.totalAllocation = Object.values(updatedStrategy.selectedETFs)
        .filter(etf => etf.selected)
        .reduce((total, etf) => total + etf.allocation, 0);

      return {
        ...prev,
        strategies: {
          ...prev.strategies,
          [strategyType]: updatedStrategy
        }
      };
    });
  };

  const getSelectedETFs = (strategyType: string): ETFSelection[] => {
    const strategy = preferences.strategies[strategyType];
    if (!strategy) return [];
    
    return Object.values(strategy.selectedETFs).filter(etf => etf.selected);
  };

  const getTotalAllocation = (strategyType: string): number => {
    const strategy = preferences.strategies[strategyType];
    return strategy?.totalAllocation || 0;
  };

  const resetStrategy = (strategyType: string) => {
    setPreferences(prev => {
      const updatedStrategies = { ...prev.strategies };
      delete updatedStrategies[strategyType];
      
      return {
        ...prev,
        strategies: updatedStrategies
      };
    });
  };

  const exportPreferences = (): string => {
    return JSON.stringify(preferences, null, 2);
  };

  const importPreferences = (data: string): boolean => {
    try {
      const parsed = JSON.parse(data);
      setPreferences(parsed);
      return true;
    } catch (error) {
      console.error('Failed to import preferences:', error);
      return false;
    }
  };

  // Initialize strategy preferences if they don't exist
  const ensureStrategyExists = (strategyType: string, etfSymbols: string[]) => {
    if (!preferences.strategies[strategyType]) {
      setPreferences(prev => ({
        ...prev,
        strategies: {
          ...prev.strategies,
          [strategyType]: getDefaultStrategyPreferences(etfSymbols)
        }
      }));
    }
  };

  const contextValue: UserPreferencesContextType = {
    preferences,
    updateETFSelection,
    updateETFAllocation,
    getSelectedETFs,
    getTotalAllocation,
    resetStrategy,
    exportPreferences,
    importPreferences
  };

  return (
    <UserPreferencesContext.Provider value={contextValue}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
}