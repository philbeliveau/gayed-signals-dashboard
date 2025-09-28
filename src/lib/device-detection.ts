'use client';

import { useState, useEffect } from 'react';

/**
 * Utility functions for device detection and responsive authentication
 */

/**
 * Detects if the current device is mobile based on screen size and user agent
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check screen size first (most reliable)
  const isMobileScreen = window.innerWidth <= 768;
  
  // Check user agent as backup
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/.test(userAgent);
  
  return isMobileScreen || isMobileUA;
}

/**
 * Detects if the device is likely to have touch capabilities
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Gets the appropriate Clerk authentication mode based on device
 */
export function getAuthMode(): 'modal' | 'redirect' {
  return isMobileDevice() ? 'redirect' : 'modal';
}

/**
 * Hook to use responsive authentication mode
 */
export function useAuthMode() {
  const [authMode, setAuthMode] = useState<'modal' | 'redirect'>('modal');
  
  useEffect(() => {
    const updateAuthMode = () => {
      setAuthMode(getAuthMode());
    };
    
    // Set initial mode
    updateAuthMode();
    
    // Update on resize
    window.addEventListener('resize', updateAuthMode);
    
    return () => {
      window.removeEventListener('resize', updateAuthMode);
    };
  }, []);
  
  return authMode;
}