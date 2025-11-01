/**
 * Environment variable type declarations for Railway Backend Integration
 * Story: 4.0h - Frontend Railway Backend Integration
 */

declare namespace NodeJS {
  interface ProcessEnv {
    // Railway Backend Configuration
    NEXT_PUBLIC_RAILWAY_BACKEND_URL: string;
    RAILWAY_API_KEY: string;
    NEXT_PUBLIC_USE_RAILWAY_BACKEND: string;

    // Existing environment variables
    NODE_ENV: 'development' | 'production' | 'test';
    TIINGO_API_KEY: string;
    ALPHA_VANTAGE_KEY: string;
    FRED_KEY: string;
    FRED_API_KEY: string;
    OPENAI_API_KEY: string;
    ANTHROPIC_API_KEY: string;
    GEMINI_API_KEY: string;
  }
}
