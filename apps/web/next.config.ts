import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
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
  
  // External packages configuration
  serverExternalPackages: ['yahoo-finance2'],

  // Webpack configuration to exclude test files
  webpack: (config, { isServer }) => {
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];

    // Exclude Deno test files from yahoo-finance2
    config.module.rules.push({
      test: /node_modules\/yahoo-finance2\/.*\/tests\//,
      loader: 'ignore-loader',
    });

    return config;
  },
};

export default nextConfig;
