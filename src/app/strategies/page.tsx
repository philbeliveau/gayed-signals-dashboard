'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StrategyDashboard from '../../components/StrategyDashboard';
import { Signal, ConsensusSignal } from '../../../lib/types';
import ThemeToggle from '../../components/ThemeToggle';

export default function StrategiesPage() {
  const [signals, setSignals] = useState<(Signal | null)[]>([]);
  const [consensus, setConsensus] = useState<ConsensusSignal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const response = await fetch('/api/signals');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        setSignals(data.signals || []);
        setConsensus(data.consensus);
      } catch (error) {
        console.error('Failed to fetch signals:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchSignals();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl font-medium text-gray-700 dark:text-gray-300">Loading strategies...</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Fetching market signals</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-xl shadow-lg">
          <div className="text-red-500 text-5xl mb-4">⚠</div>
          <div className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">Error Loading Strategies</div>
          <div className="text-gray-600 dark:text-gray-400 mb-6">{error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!consensus) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 dark:text-gray-400">No signal data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                ← Back to Dashboard
              </Link>
              <div className="text-gray-300 dark:text-gray-600">|</div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Strategy Analysis</h1>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Strategy Dashboard */}
      <StrategyDashboard 
        signals={signals}
        consensus={consensus}
        isRealData={true}
      />
    </div>
  );
}