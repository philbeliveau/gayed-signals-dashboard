'use client';

import { ReactNode, useEffect, useState } from 'react';

interface NoSSRWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * NoSSRWrapper - Prevents SSR hydration issues with client-only components
 * 
 * This wrapper ensures that wrapped components only render on the client side,
 * preventing hydration mismatches with components that use browser-specific APIs
 * or have different server/client rendering behavior.
 * 
 * Usage:
 * <NoSSRWrapper fallback={<div>Loading chart...</div>}>
 *   <RechartsComponent />
 * </NoSSRWrapper>
 */
export default function NoSSRWrapper({ children, fallback = null }: NoSSRWrapperProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR and before hydration, show fallback or nothing
  if (!mounted) {
    return <>{fallback}</>;
  }

  // After hydration, show the actual content
  return <>{children}</>;
}