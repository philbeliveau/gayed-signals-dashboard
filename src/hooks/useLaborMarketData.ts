'use client';

import { useEffect, useCallback } from 'react';
import { useMarketDataState } from './useMarketDataState';

interface LaborDataPoint {
  date: string;
  initialClaims: number;
  continuedClaims: number;
  claims4Week: number;
  unemploymentRate: number;
  nonfarmPayrolls: number;
  laborParticipation: number;
  jobOpenings: number;
  weeklyChangeInitial: number;
  weeklyChangeContinued: number;
  monthlyChangePayrolls: number;
}

interface LaborAlert {
  id: string;
  type: 'claims_spike' | 'unemployment_rise' | 'payroll_decline' | 'participation_drop';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  indicator: string;
  currentValue: number;
  thresholdValue: number;
}

type PeriodType = '3m' | '6m' | '12m' | '24m';

interface UseLaborMarketDataProps {
  period?: PeriodType;
  fastMode?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface LaborMarketResponse {
  period: string;
  laborData: LaborDataPoint[];
  currentMetrics: Record<string, number>;
  alerts: LaborAlert[];
  historicalComparison: Record<string, any>;
  correlationAnalysis: Record<string, any>;
  metadata: {
    timestamp: string;
    dataSource: string;
    indicatorCount: number;
    fastMode: boolean;
    period: string;
  };
}

/**
 * Custom hook for fetching and managing Labor Market data
 * 
 * Features:
 * - Automatic data fetching on mount and period changes
 * - Manual refresh capability
 * - Loading states and error handling
 * - Alert monitoring
 * - Auto-refresh functionality (optional)
 */
export function useLaborMarketData({
  period = '12m',
  fastMode = false,
  autoRefresh = false,
  refreshInterval = 600000 // 10 minutes
}: UseLaborMarketDataProps = {}) {
  
  const { state, actions } = useMarketDataState<LaborDataPoint>();

  const fetchLaborData = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        actions.startRefresh();
      } else {
        actions.startFetch();
      }

      console.log(`👥 Fetching labor data for period: ${period}`);
      
      const response = await fetch(`/api/labor?period=${period}&fast=${fastMode}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch labor data: ${response.status} ${response.statusText}`);
      }
      
      const data: LaborMarketResponse = await response.json();
      console.log('👥 Successfully fetched labor data:', data.laborData?.length, 'points');
      
      // Transform and validate data
      const transformedData: LaborDataPoint[] = (data.laborData || []).map(item => ({
        date: item.date,
        initialClaims: item.initialClaims || 0,
        continuedClaims: item.continuedClaims || 0,
        claims4Week: item.claims4Week || 0,
        unemploymentRate: item.unemploymentRate || 0,
        nonfarmPayrolls: item.nonfarmPayrolls || 0,
        laborParticipation: item.laborParticipation || 0,
        jobOpenings: item.jobOpenings || 0,
        weeklyChangeInitial: item.weeklyChangeInitial || 0,
        weeklyChangeContinued: item.weeklyChangeContinued || 0,
        monthlyChangePayrolls: item.monthlyChangePayrolls || 0
      }));
      
      actions.successFetch(transformedData, data.alerts || []);
      
      return { data: transformedData, alerts: data.alerts || [], metadata: data.metadata };
      
    } catch (error) {
      console.error('❌ Error fetching labor data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load labor market data';
      actions.errorFetch(errorMessage);
      throw error;
    }
  }, [period, fastMode, actions]);

  // Auto-fetch on mount and period changes
  useEffect(() => {
    fetchLaborData();
  }, [fetchLaborData]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      fetchLaborData(true);
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchLaborData]);

  // Helper functions for data analysis
  const getCurrentData = useCallback(() => {
    if (state.data.length === 0) return null;
    return state.data[state.data.length - 1];
  }, [state.data]);

  const getStressLevel = useCallback((): 'low' | 'medium' | 'high' => {
    const currentData = getCurrentData();
    if (!currentData) return 'medium';

    const stressFactors = [
      currentData.continuedClaims > 1800000, // Above concerning level
      currentData.unemploymentRate > 4.5, // Above comfort zone
      currentData.weeklyChangeInitial > 5.0, // Large weekly increase in initial claims
      currentData.laborParticipation < 63.0, // Low participation
      state.alerts.some(a => a.severity === 'critical')
    ];

    const stressCount = stressFactors.filter(Boolean).length;
    
    if (stressCount >= 3) return 'high';
    if (stressCount >= 1) return 'medium';
    return 'low';
  }, [getCurrentData, state.alerts]);

  const refreshData = useCallback(() => {
    return fetchLaborData(true);
  }, [fetchLaborData]);

  return {
    // Data state
    data: state.data,
    loading: state.loading,
    error: state.error,
    alerts: state.alerts,
    lastUpdated: state.lastUpdated,
    refreshing: state.refreshing,
    
    // Actions
    refreshData,
    clearError: actions.clearError,
    
    // Helper functions
    getCurrentData,
    getStressLevel,
    
    // Configuration
    period,
    fastMode
  };
}

export type { LaborDataPoint, LaborAlert, PeriodType };