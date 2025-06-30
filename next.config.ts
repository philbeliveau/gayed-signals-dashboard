import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  
  // API proxy configuration for development
  async rewrites() {
    return [
      {
        source: '/api/python/:path*',
        destination: `http://localhost:${process.env.PYTHON_SERVICE_PORT || 5000}/:path*`,
      },
      {
        source: '/api/backtrader-service/:path*',
        destination: `http://localhost:${process.env.PYTHON_SERVICE_PORT || 5000}/:path*`,
      },
    ];
  },
  
  // CORS and security headers
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production' 
              ? process.env.ALLOWED_ORIGINS || 'https://yourdomain.com'
              : '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400',
          },
        ],
      },
    ];
  },
  
  // Environment variables to expose to client
  env: {
    PYTHON_SERVICE_URL: process.env.PYTHON_SERVICE_URL || 'http://localhost:5000',
    PYTHON_SERVICE_PORT: process.env.PYTHON_SERVICE_PORT || '5000',
  },
  
  // Development configuration
  ...(process.env.NODE_ENV === 'development' && {
    experimental: {
      serverComponentsExternalPackages: ['yahoo-finance2'],
    },
  }),
};

export default nextConfig;
