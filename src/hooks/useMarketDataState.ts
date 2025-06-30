'use client';

import { useReducer, useCallback } from 'react';

interface MarketDataState<T = any> {
  data: T[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshing: boolean;
  alerts: any[];
}

type MarketDataAction<T = any> = 
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: { data: T[]; alerts: any[] } }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'REFRESH_START' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET' };

function marketDataReducer<T>(state: MarketDataState<T>, action: MarketDataAction<T>): MarketDataState<T> {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        loading: false,
        refreshing: false,
        data: action.payload.data,
        alerts: action.payload.alerts,
        lastUpdated: new Date(),
        error: null
      };
    case 'FETCH_ERROR':
      return { ...state, loading: false, refreshing: false, error: action.payload };
    case 'REFRESH_START':
      return { ...state, refreshing: true, error: null };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'RESET':
      return {
        data: [],
        loading: true,
        error: null,
        lastUpdated: null,
        refreshing: false,
        alerts: []
      };
    default:
      return state;
  }
}

const initialState: MarketDataState = {
  data: [],
  loading: true,
  error: null,
  lastUpdated: null,
  refreshing: false,
  alerts: []
};

/**
 * Custom hook for managing market data state with reducer pattern
 * Consolidates multiple useState hooks into a single, predictable state management system
 */
export function useMarketDataState<T = any>() {
  const [state, dispatch] = useReducer(marketDataReducer<T>, initialState);
  
  const actions = {
    startFetch: useCallback(() => dispatch({ type: 'FETCH_START' }), []),
    
    successFetch: useCallback((data: T[], alerts: any[] = []) => 
      dispatch({ type: 'FETCH_SUCCESS', payload: { data, alerts } }), []),
    
    errorFetch: useCallback((error: string) => 
      dispatch({ type: 'FETCH_ERROR', payload: error }), []),
    
    startRefresh: useCallback(() => dispatch({ type: 'REFRESH_START' }), []),
    
    clearError: useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []),
    
    reset: useCallback(() => dispatch({ type: 'RESET' }), [])
  };
  
  return { state, actions };
}