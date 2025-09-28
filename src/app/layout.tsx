import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ConditionalClerkProvider } from "../components/auth/ClerkWrapper";
import { ThemeProvider } from "../contexts/ThemeContext";
import { UserPreferencesProvider } from "../contexts/UserPreferencesContext";
import ProfessionalLayout from "../components/layout/ProfessionalLayout";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gayed Signal Dashboard - Professional Market Regime Analysis",
  description: "Advanced market regime analysis dashboard based on Michael Gayed's research signals. Professional trading tools for risk-on/risk-off market assessment.",
  keywords: "trading, market signals, risk management, market regime, financial analysis, investment research",
  authors: [{ name: "Gayed Signal Dashboard" }],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f8" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" }
  ],
  colorScheme: "light dark",
};

// Force dynamic rendering to avoid Clerk issues during build
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#f4f6f8" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased touch-manipulation`}
        suppressHydrationWarning
      >
        <ConditionalClerkProvider publishableKey={clerkPublishableKey}>
          <ThemeProvider>
            <UserPreferencesProvider>
              <ProfessionalLayout>
                {!clerkPublishableKey && (
                  <div className="fixed top-4 left-4 right-4 z-50 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                    <strong>Demo Mode:</strong> Authentication disabled - Clerk environment variables not configured
                  </div>
                )}
                {children}
              </ProfessionalLayout>
            </UserPreferencesProvider>
          </ThemeProvider>
        </ConditionalClerkProvider>
      </body>
    </html>
  );
}
