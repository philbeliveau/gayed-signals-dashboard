'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook for client-side detection to prevent hydration mismatches
 * Replaces the repeated isClient useState pattern across components
 */
export function useClientSide(): boolean {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}