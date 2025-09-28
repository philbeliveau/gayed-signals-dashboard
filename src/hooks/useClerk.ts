'use client';

// Conditional exports based on environment
const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (clerkPublishableKey) {
  // Export real Clerk hooks and components when available
  export { useAuth, useUser, SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
} else {
  // Export mock hooks and components when Clerk isn't available
  export {
    useAuth,
    useUser,
    MockSignedIn as SignedIn,
    MockSignedOut as SignedOut,
    MockSignInButton as SignInButton,
    MockUserButton as UserButton,
  } from '../components/auth/ClerkWrapper';
}