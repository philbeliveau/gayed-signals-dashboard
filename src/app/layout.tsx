import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from "../contexts/ThemeContext";
import { UserPreferencesProvider } from "../contexts/UserPreferencesContext";
import AuthNavigation from "../components/navigation/AuthNavigation";
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
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0A" }
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0A0A0A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased touch-manipulation`}
        suppressHydrationWarning
      >
        <ClerkProvider 
          publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
        >
          <ThemeProvider>
            <UserPreferencesProvider>
              <AuthNavigation />
              <main>
                {children}
              </main>
            </UserPreferencesProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
