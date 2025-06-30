# Gayed Signal Dashboard - Complete Implementation Guide

**Version:** 1.0  
**Target:** Claude-Code Implementation  
**Architecture:** Next.js + TypeScript + Messari-Style UI

---

## Executive Summary

Build a personal dashboard that calculates Michael Gayed's five market regime signals directly from raw market data using a Messari-inspired professional interface. This eliminates newsletter parsing complexity while providing real-time signal generation based on proven intermarket analysis methodologies.

**Reference Document:** Consult "Building Michael Gayed's Market Regime Signals from Raw Market Data" (Document 2) for exact signal calculation methodologies and mathematical formulas.

---

## Project Setup & Dependencies

```bash
# Initialize Next.js project with TypeScript and Tailwind
npx create-next-app@latest gayed-signals-dashboard --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Core dependencies for financial dashboard
npm install recharts lucide-react @headlessui/react class-variance-authority clsx
npm install yahoo-finance2 node-cron sqlite3 date-fns
npm install @types/node-cron --save-dev
```

---

## Core Architecture

### 1. Database Schema & Data Layer

```typescript
// lib/types.ts
export interface MarketData {
  date: string;
  symbol: string;
  close: number;
  volume?: number;
}

export interface Signal {
  date: string;
  type: 'utilities_spy' | 'lumber_gold' | 'treasury_duration' | 'sp500_ma' | 'vix';
  signal: 'Risk-On' | 'Risk-Off' | 'Neutral';
  strength: 'Strong' | 'Moderate' | 'Weak';
  confidence: number; // 0-1
  rawValue: number;
  metadata?: Record<string, any>;
}

export interface ConsensusSignal {
  date: string;
  consensus: 'Risk-On' | 'Risk-Off' | 'Mixed';
  confidence: number;
  riskOnCount: number;
  riskOffCount: number;
  signals: Signal[];
}
```

### 2. Signal Calculation Engine (From Document 2)

```typescript
// lib/signals/calculator.ts
import { Signal } from '../types';

export class GayedSignalCalculator {
  
  // Utilities/S&P 500 Beta Rotation (21-day lookback)
  static calculateUtilitiesSignal(xluPrices: number[], spyPrices: number[]): Signal | null {
    const lookback = 21;
    if (xluPrices.length < lookback + 1) return null;
    
    const xluReturn = (xluPrices[xluPrices.length - 1] / xluPrices[xluPrices.length - 1 - lookback]) - 1;
    const spyReturn = (spyPrices[spyPrices.length - 1] / spyPrices[spyPrices.length - 1 - lookback]) - 1;
    const ratio = (1 + xluReturn) / (1 + spyReturn);
    
    return {
      type: 'utilities_spy',
      signal: ratio > 1.0 ? 'Risk-Off' : 'Risk-On',
      strength: Math.abs(ratio - 1.0) > 0.05 ? 'Strong' : Math.abs(ratio - 1.0) > 0.02 ? 'Moderate' : 'Weak',
      confidence: Math.min(Math.abs(ratio - 1.0) * 10, 1),
      rawValue: ratio,
      date: new Date().toISOString(),
      metadata: { xluReturn, spyReturn, lookback }
    };
  }

  // Lumber/Gold Ratio (13-week lookback = 65 trading days)
  static calculateLumberGoldSignal(woodPrices: number[], gldPrices: number[]): Signal | null {
    const lookback = 65; // 13 weeks * 5 days
    if (woodPrices.length < lookback + 1) return null;
    
    const woodReturn = (woodPrices[woodPrices.length - 1] / woodPrices[woodPrices.length - 1 - lookback]) - 1;
    const gldReturn = (gldPrices[gldPrices.length - 1] / gldPrices[gldPrices.length - 1 - lookback]) - 1;
    const ratio = (1 + woodReturn) / (1 + gldReturn);
    
    return {
      type: 'lumber_gold',
      signal: ratio > 1.0 ? 'Risk-On' : 'Risk-Off',
      strength: Math.abs(ratio - 1.0) > 0.20 ? 'Strong' : Math.abs(ratio - 1.0) > 0.10 ? 'Moderate' : 'Weak',
      confidence: Math.min(Math.abs(ratio - 1.0) * 5, 1),
      rawValue: ratio,
      date: new Date().toISOString(),
      metadata: { woodReturn, gldReturn, lookback }
    };
  }

  // Treasury Duration Signal (21-day lookback)
  static calculateTreasuryDurationSignal(iefPrices: number[], tltPrices: number[]): Signal | null {
    const lookback = 21;
    if (iefPrices.length < lookback + 1) return null;
    
    const iefReturn = (iefPrices[iefPrices.length - 1] / iefPrices[iefPrices.length - 1 - lookback]) - 1;
    const tltReturn = (tltPrices[tltPrices.length - 1] / tltPrices[tltPrices.length - 1 - lookback]) - 1;
    const ratio = (1 + tltReturn) / (1 + iefReturn);
    
    return {
      type: 'treasury_duration',
      signal: ratio > 1.0 ? 'Risk-Off' : 'Risk-On',
      strength: Math.abs(ratio - 1.0) > 0.02 ? 'Strong' : Math.abs(ratio - 1.0) > 0.01 ? 'Moderate' : 'Weak',
      confidence: Math.min(Math.abs(ratio - 1.0) * 50, 1),
      rawValue: ratio,
      date: new Date().toISOString(),
      metadata: { iefReturn, tltReturn, lookback }
    };
  }

  // S&P 500 200-Day Moving Average
  static calculateSP500MASignal(spyPrices: number[]): Signal | null {
    if (spyPrices.length < 200) return null;
    
    const currentPrice = spyPrices[spyPrices.length - 1];
    const sma200 = spyPrices.slice(-200).reduce((a, b) => a + b) / 200;
    const distancePct = (currentPrice - sma200) / sma200 * 100;
    
    return {
      type: 'sp500_ma',
      signal: currentPrice > sma200 ? 'Risk-On' : 'Risk-Off',
      strength: Math.abs(distancePct) > 10 ? 'Strong' : Math.abs(distancePct) > 5 ? 'Moderate' : 'Weak',
      confidence: Math.min(Math.abs(distancePct) / 10, 1),
      rawValue: distancePct,
      date: new Date().toISOString(),
      metadata: { currentPrice, sma200, distancePct }
    };
  }

  // VIX Volatility Signal (252-day percentile)
  static calculateVIXSignal(vixValues: number[]): Signal | null {
    if (vixValues.length < 252) return null;
    
    const currentVix = vixValues[vixValues.length - 1];
    const historicalWindow = vixValues.slice(-252);
    const sortedValues = [...historicalWindow].sort((a, b) => a - b);
    const percentile = (sortedValues.findIndex(val => val >= currentVix) / sortedValues.length) * 100;
    
    let signal: 'Risk-On' | 'Risk-Off' | 'Neutral' = 'Neutral';
    if (percentile <= 25) signal = 'Risk-Off'; // Low VIX = defensive positioning
    else if (percentile >= 75) signal = 'Risk-On'; // High VIX = cyclical positioning
    
    return {
      type: 'vix',
      signal,
      strength: percentile <= 10 || percentile >= 90 ? 'Strong' : 
                percentile <= 20 || percentile >= 80 ? 'Moderate' : 'Weak',
      confidence: Math.abs(percentile - 50) / 50,
      rawValue: percentile,
      date: new Date().toISOString(),
      metadata: { currentVix, percentile, historicalWindow: historicalWindow.length }
    };
  }
}
```

### 3. Yahoo Finance Data Integration

```typescript
// lib/yahoo-finance.ts
import yahooFinance from 'yahoo-finance2';
import { MarketData } from './types';

export async function fetchMarketData(symbols: string[], period: string = '2y'): Promise<Record<string, MarketData[]>> {
  const results: Record<string, MarketData[]> = {};
  
  for (const symbol of symbols) {
    try {
      const cleanSymbol = symbol.replace('^', '');
      const historical = await yahooFinance.historical(symbol, {
        period1: new Date(Date.now() - (2 * 365 * 24 * 60 * 60 * 1000)), // 2 years ago
        period2: new Date(),
        interval: '1d'
      });
      
      results[cleanSymbol] = historical.map(data => ({
        date: data.date.toISOString().split('T')[0],
        symbol: cleanSymbol,
        close: data.close,
        volume: data.volume
      }));
    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error);
      results[symbol] = [];
    }
  }
  
  return results;
}
```

---

## Messari-Style UI Components

### 4. Signal Card Component

```typescript
// components/ui/signal-card.tsx
import { Signal } from '@/lib/types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SignalCardProps {
  signal: Signal;
  trend?: 'up' | 'down' | 'flat';
  className?: string;
}

export function SignalCard({ signal, trend, className = '' }: SignalCardProps) {
  const signalColor = signal.signal === 'Risk-On' ? 'text-green-400' : 
                     signal.signal === 'Risk-Off' ? 'text-red-400' : 'text-gray-400';
  
  const strengthColor = signal.strength === 'Strong' ? 'bg-blue-500' :
                       signal.strength === 'Moderate' ? 'bg-yellow-500' : 'bg-gray-500';

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition-all ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium text-sm uppercase tracking-wide">
          {signal.type.replace('_', ' / ')}
        </h3>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full ${strengthColor} text-white`}>
            {signal.strength}
          </span>
          {trend && <TrendIcon className="w-4 h-4 text-gray-400" />}
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className={`text-xl font-bold ${signalColor}`}>
            {signal.signal}
          </span>
          <span className="text-gray-400 text-sm">
            {(signal.confidence * 100).toFixed(0)}% confidence
          </span>
        </div>
        
        <div className="text-gray-500 text-sm">
          Raw Value: {signal.rawValue.toFixed(4)}
        </div>
        
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${signal.signal === 'Risk-On' ? 'bg-green-400' : 'bg-red-400'}`}
            style={{ width: `${signal.confidence * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
```

### 5. Market Data Table

```typescript
// components/ui/market-data-table.tsx
import { Signal } from '@/lib/types';

interface MarketDataTableProps {
  signals: Signal[];
  className?: string;
}

export function MarketDataTable({ signals, className = '' }: MarketDataTableProps) {
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-lg overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b border-gray-800">
        <h2 className="text-white font-semibold">Market Regime Signals</h2>
        <p className="text-gray-400 text-sm mt-1">Real-time intermarket analysis</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-850">
            <tr>
              <th className="text-left px-6 py-3 text-gray-400 text-sm font-medium">Signal</th>
              <th className="text-left px-6 py-3 text-gray-400 text-sm font-medium">Status</th>
              <th className="text-right px-6 py-3 text-gray-400 text-sm font-medium">Strength</th>
              <th className="text-right px-6 py-3 text-gray-400 text-sm font-medium">Confidence</th>
              <th className="text-right px-6 py-3 text-gray-400 text-sm font-medium">Raw Value</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((signal, index) => (
              <tr key={signal.type} className={index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-850'}>
                <td className="px-6 py-4">
                  <div className="text-white font-medium">
                    {signal.type.replace('_', ' / ').toUpperCase()}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                    ${signal.signal === 'Risk-On' ? 'bg-green-400/10 text-green-400' : 
                      signal.signal === 'Risk-Off' ? 'bg-red-400/10 text-red-400' : 
                      'bg-gray-400/10 text-gray-400'}`}>
                    {signal.signal}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-white">
                  {signal.strength}
                </td>
                <td className="px-6 py-4 text-right text-gray-300">
                  {(signal.confidence * 100).toFixed(0)}%
                </td>
                <td className="px-6 py-4 text-right text-gray-300 font-mono">
                  {signal.rawValue.toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### 6. Consensus Panel

```typescript
// components/consensus-panel.tsx
import { ConsensusSignal } from '@/lib/types';

interface ConsensusPanelProps {
  consensusSignal: ConsensusSignal;
}

export function ConsensusPanel({ consensusSignal }: ConsensusPanelProps) {
  const consensusColor = consensusSignal.consensus === 'Risk-On' ? 'text-green-400' :
                        consensusSignal.consensus === 'Risk-Off' ? 'text-red-400' : 'text-yellow-400';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-8">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Market Regime Consensus</h1>
        <p className="text-gray-400">Based on 5 intermarket signals</p>
      </div>
      
      <div className="text-center mb-8">
        <div className={`text-6xl font-bold ${consensusColor} mb-2`}>
          {consensusSignal.consensus}
        </div>
        <div className="text-gray-300 text-lg">
          {(consensusSignal.confidence * 100).toFixed(0)}% Confidence
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-6 text-center">
        <div>
          <div className="text-2xl font-bold text-green-400">
            {consensusSignal.riskOnCount}
          </div>
          <div className="text-gray-400 text-sm">Risk-On Signals</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-red-400">
            {consensusSignal.riskOffCount}
          </div>
          <div className="text-gray-400 text-sm">Risk-Off Signals</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-400">
            {5 - consensusSignal.riskOnCount - consensusSignal.riskOffCount}
          </div>
          <div className="text-gray-400 text-sm">Neutral Signals</div>
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-gray-800 rounded-lg">
        <h3 className="text-white font-medium mb-3">Signal Breakdown</h3>
        <div className="space-y-2">
          {consensusSignal.signals.map(signal => (
            <div key={signal.type} className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">
                {signal.type.replace('_', ' / ').toUpperCase()}
              </span>
              <span className={`text-sm font-medium
                ${signal.signal === 'Risk-On' ? 'text-green-400' :
                  signal.signal === 'Risk-Off' ? 'text-red-400' : 'text-gray-400'}`}>
                {signal.signal}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## Main Dashboard & API

### 7. Dashboard Page

```typescript
// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { ConsensusPanel } from '@/components/consensus-panel';
import { MarketDataTable } from '@/components/ui/market-data-table';
import { SignalCard } from '@/components/ui/signal-card';
import { Signal, ConsensusSignal } from '@/lib/types';

export default function Dashboard() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [consensusSignal, setConsensusSignal] = useState<ConsensusSignal | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSignals = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/signals');
        const data = await response.json();
        setSignals(data.signals || []);
        setConsensusSignal(data.consensus);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Failed to fetch signals:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSignals();
    const interval = setInterval(fetchSignals, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-2xl">Loading signals...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gayed Signal Dashboard</h1>
            <p className="text-gray-400 text-sm">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-400">Market Status</div>
              <div className="text-green-400 font-medium">LIVE</div>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Consensus Panel */}
        {consensusSignal && (
          <div className="mb-8">
            <ConsensusPanel consensusSignal={consensusSignal} />
          </div>
        )}

        {/* Signal Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
          {signals.map(signal => (
            <SignalCard key={signal.type} signal={signal} />
          ))}
        </div>

        {/* Market Data Table */}
        <div className="mb-8">
          <MarketDataTable signals={signals} />
        </div>
      </div>
    </div>
  );
}
```

### 8. API Route

```typescript
// app/api/signals/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GayedSignalCalculator } from '@/lib/signals/calculator';
import { fetchMarketData } from '@/lib/yahoo-finance';
import { ConsensusSignal } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    // Fetch latest market data
    const symbols = ['SPY', 'XLU', 'WOOD', 'GLD', 'IEF', 'TLT', '^VIX'];
    const marketData = await fetchMarketData(symbols, '2y'); // 2 years of data

    // Calculate all signals
    const signals = [
      GayedSignalCalculator.calculateUtilitiesSignal(
        marketData.XLU?.map(d => d.close) || [],
        marketData.SPY?.map(d => d.close) || []
      ),
      GayedSignalCalculator.calculateLumberGoldSignal(
        marketData.WOOD?.map(d => d.close) || [],
        marketData.GLD?.map(d => d.close) || []
      ),
      GayedSignalCalculator.calculateTreasuryDurationSignal(
        marketData.IEF?.map(d => d.close) || [],
        marketData.TLT?.map(d => d.close) || []
      ),
      GayedSignalCalculator.calculateSP500MASignal(
        marketData.SPY?.map(d => d.close) || []
      ),
      GayedSignalCalculator.calculateVIXSignal(
        marketData.VIX?.map(d => d.close) || []
      )
    ].filter(Boolean);

    // Calculate consensus
    const riskOnCount = signals.filter(s => s?.signal === 'Risk-On').length;
    const riskOffCount = signals.filter(s => s?.signal === 'Risk-Off').length;
    
    const consensus: ConsensusSignal = {
      date: new Date().toISOString(),
      consensus: riskOnCount > riskOffCount ? 'Risk-On' : 
                riskOffCount > riskOnCount ? 'Risk-Off' : 'Mixed',
      confidence: Math.abs(riskOnCount - riskOffCount) / signals.length,
      riskOnCount,
      riskOffCount,
      signals: signals.filter(s => s !== null)
    };

    return NextResponse.json({ signals: signals.filter(s => s !== null), consensus });
  } catch (error) {
    console.error('Error calculating signals:', error);
    return NextResponse.json({ error: 'Failed to calculate signals' }, { status: 500 });
  }
}
```

---

## Styling Configuration

### 9. Global Styles

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    box-sizing: border-box;
  }
  
  body {
    @apply bg-black text-white antialiased;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  }
}

@layer utilities {
  .bg-gray-850 {
    background-color: rgb(30, 30, 35);
  }
  
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}
```

### 10. Tailwind Configuration

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          850: 'rgb(30, 30, 35)',
        }
      }
    },
  },
  plugins: [],
}
```

### 11. Next.js Configuration

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverComponentsExternalPackages: ['yahoo-finance2']
  }
}

module.exports = nextConfig
```

---

## Implementation Priority

1. **Week 1**: Core signal calculations + Yahoo Finance integration + basic API
2. **Week 2**: Main dashboard UI with Messari styling + consensus panel
3. **Week 3**: Signal cards + market data table + responsive design
4. **Week 4**: Error handling + performance optimization + deployment

**Key Requirements:**
- All signal calculations must follow Document 2 methodologies exactly
- UI must match Messari's dark theme and professional layout
- Focus on decision support only (no automated trading)
- End-of-day data updates are sufficient
- Yahoo Finance free tier only

**Success Criteria:**
- Dashboard loads in <3 seconds
- Signals align with known market stress periods
- Professional appearance matching institutional software
- Mobile responsive design