'use client';

import { Users, Activity, BarChart3, LineChart, Home } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import LaborMarketTab from '../../components/LaborMarketTab';

export default function LaborMarketPage() {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text trading-background-subtle">
      {/* Enhanced Header */}
      <header className="border-b border-theme-border bg-theme-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-theme-primary to-theme-primary-hover rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">G</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-theme-text">Gayed Signal Dashboard</h1>
                <p className="text-theme-text-muted text-sm">Labor Market Analysis & Employment Trends</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-theme-success rounded-full animate-pulse"></div>
                <span className="text-sm text-theme-success font-medium">Live</span>
              </div>
              
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-6 pb-4">
          <div className="flex space-x-1 bg-theme-bg p-1 rounded-xl border border-theme-border overflow-x-auto">
            <Link 
              href="/" 
              className="flex items-center space-x-2 px-4 py-3 rounded-lg text-theme-text-muted hover:text-theme-text hover:bg-theme-card-hover transition-colors whitespace-nowrap"
            >
              <Activity className="w-4 h-4" />
              <span>Live Signals</span>
            </Link>
            <Link 
              href="/strategies" 
              className="flex items-center space-x-2 px-4 py-3 rounded-lg text-theme-text-muted hover:text-theme-text hover:bg-theme-card-hover transition-colors whitespace-nowrap"
            >
              <span className="text-lg">📊</span>
              <span>Strategy Dashboard</span>
            </Link>
            <Link 
              href="/backtest" 
              className="flex items-center space-x-2 px-4 py-3 rounded-lg text-theme-text-muted hover:text-theme-text hover:bg-theme-card-hover transition-colors whitespace-nowrap"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Backtesting Lab</span>
            </Link>
            <Link 
              href="/backtrader" 
              className="flex items-center space-x-2 px-4 py-3 rounded-lg text-theme-text-muted hover:text-theme-text hover:bg-theme-card-hover transition-colors whitespace-nowrap"
            >
              <LineChart className="w-4 h-4" />
              <span>Backtrader Analysis</span>
            </Link>
            <Link 
              href="/housing" 
              className="flex items-center space-x-2 px-4 py-3 rounded-lg text-theme-text-muted hover:text-theme-text hover:bg-theme-card-hover transition-colors whitespace-nowrap"
            >
              <Home className="w-4 h-4" />
              <span>Housing Market</span>
            </Link>
            <div className="flex items-center space-x-2 px-4 py-3 rounded-lg bg-theme-primary text-white whitespace-nowrap">
              <Users className="w-4 h-4" />
              <span>Labor Market</span>
            </div>
          </div>
        </div>
      </header>

      {/* Labor Market Tab Content */}
      <main className="max-w-7xl mx-auto">
        <LaborMarketTab />
      </main>
    </div>
  );
}