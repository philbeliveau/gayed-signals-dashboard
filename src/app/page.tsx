'use client';

import { useState, useEffect } from 'react';

interface Signal {
  type: string;
  signal: 'Risk-On' | 'Risk-Off' | 'Neutral';
  strength: 'Strong' | 'Moderate' | 'Weak';
  confidence: number;
  rawValue: number;
  date: string;
}

interface ConsensusSignal {
  consensus: 'Risk-On' | 'Risk-Off' | 'Mixed';
  confidence: number;
  riskOnCount: number;
  riskOffCount: number;
  signals: Signal[];
}

export default function Dashboard() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [consensus, setConsensus] = useState<ConsensusSignal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSignals = async () => {
      try {
        setLoading(true);
        setError(null);
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
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-2xl">Loading Gayed signals...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl text-red-400 mb-4">Error Loading Signals</div>
          <div className="text-gray-400">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <h1 className="text-2xl font-bold">Gayed Signal Dashboard</h1>
        <p className="text-gray-400 text-sm">Market Regime Analysis</p>
      </header>

      <div className="p-6 max-w-7xl mx-auto">
        {consensus && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 mb-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2">Market Consensus</h2>
              <div className={`text-6xl font-bold mb-4 ${
                consensus.consensus === 'Risk-On' ? 'text-green-400' : 'text-red-400'
              }`}>
                {consensus.consensus}
              </div>
              <div className="text-gray-300 text-lg">
                {(consensus.confidence * 100).toFixed(0)}% Confidence
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {signals.map((signal, index) => (
            <div key={index} className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h3 className="text-white font-medium text-sm uppercase tracking-wide mb-4">
                {signal.type.replace('_', ' / ')}
              </h3>
              
              <div className={`text-2xl font-bold mb-2 ${
                signal.signal === 'Risk-On' ? 'text-green-400' : 'text-red-400'
              }`}>
                {signal.signal}
              </div>
              
              <div className="text-gray-400 text-sm mb-2">
                Strength: {signal.strength}
              </div>
              
              <div className="text-gray-400 text-sm mb-4">
                Confidence: {(signal.confidence * 100).toFixed(0)}%
              </div>
              
              <div className="text-gray-500 text-xs">
                Raw Value: {signal.rawValue.toFixed(4)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
