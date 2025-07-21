#!/usr/bin/env node

/**
 * Environment Configuration Validator
 * Validates all environment variables for different deployment platforms
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

class EnvironmentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
    this.envs = {};
    
    // Load environment files
    this.loadEnvironmentFiles();
  }

  loadEnvironmentFiles() {
    const envFiles = [
      '.env',
      '.env.production',
      '.env.vercel',
      '.env.railway',
      'backend/.env',
      'python-services/backtrader-analysis/.env'
    ];

    envFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        try {
          this.envs[file] = dotenv.parse(fs.readFileSync(filePath));
          this.log(`✅ Loaded ${file}`, 'green');
        } catch (error) {
          this.error(`❌ Failed to parse ${file}: ${error.message}`);
        }
      } else {
        this.warning(`⚠️  Environment file not found: ${file}`);
      }
    });
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  error(message) {
    this.errors.push(message);
    this.log(message, 'red');
  }

  warning(message) {
    this.warnings.push(message);
    this.log(message, 'yellow');
  }

  success(message) {
    this.passed.push(message);
    this.log(message, 'green');
  }

  // Required API keys for core functionality
  getRequiredApiKeys() {
    return {
      financial: [
        'TIINGO_API_KEY',
        'FRED_KEY',
        'ALPHA_VANTAGE_KEY',
        'BUREAU_OF_STATISTIC_KEY'
      ],
      ai: [
        'OPENAI_API_KEY',
        'ANTHROPIC_API_KEY'
      ],
      security: [
        'SECRET_KEY',
        'JWT_SECRET'
      ],
      database: [
        'DATABASE_URL'
      ]
    };
  }

  // Optional but recommended API keys
  getOptionalApiKeys() {
    return {
      news: ['GNEWS_API_KEY', 'PUBMED_API_KEY'],
      social: ['REDDIT_API_KEY', 'REDDIT_PERSONAL_ID'],
      government: ['SEC_API_KEY'],
      cloud: ['QDRANT_API_KEY', 'SUPABASE_API_KEY', 'NIA_API_KEY'],
      ai_extended: ['GEMINI_API_KEY', 'PERPLEXITY_API_KEY']
    };
  }

  validateApiKeys() {
    this.log('\n🔑 Validating API Keys...', 'bold');
    
    const required = this.getRequiredApiKeys();
    const optional = this.getOptionalApiKeys();

    // Check required keys in main .env
    const mainEnv = this.envs['.env'] || {};
    
    Object.entries(required).forEach(([category, keys]) => {
      this.log(`\n📂 ${category.toUpperCase()} APIs:`, 'cyan');
      
      keys.forEach(key => {
        const value = mainEnv[key];
        if (!value) {
          this.error(`  ❌ Missing required ${key}`);
        } else if (value.includes('your_') || value.includes('change_in_production')) {
          this.warning(`  ⚠️  ${key} contains placeholder value`);
        } else {
          this.success(`  ✅ ${key} is configured`);
        }
      });
    });

    // Check optional keys
    Object.entries(optional).forEach(([category, keys]) => {
      this.log(`\n📂 ${category.toUpperCase()} APIs (Optional):`, 'cyan');
      
      keys.forEach(key => {
        const value = mainEnv[key];
        if (!value || value.includes('your_')) {
          this.log(`  ⭕ ${key} not configured (optional)`, 'yellow');
        } else {
          this.success(`  ✅ ${key} is configured`);
        }
      });
    });
  }

  validateDatabaseConfiguration() {
    this.log('\n🗄️  Validating Database Configuration...', 'bold');
    
    Object.entries(this.envs).forEach(([file, env]) => {
      this.log(`\n📄 ${file}:`, 'cyan');
      
      // Check DATABASE_URL format
      const dbUrl = env.DATABASE_URL;
      if (dbUrl) {
        if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgresql+asyncpg://')) {
          this.success(`  ✅ PostgreSQL configuration found`);
        } else if (dbUrl.startsWith('sqlite://') || dbUrl.startsWith('sqlite+aiosqlite://')) {
          this.log(`  ℹ️  SQLite configuration (development)`, 'blue');
        } else if (dbUrl.startsWith('mysql://')) {
          this.success(`  ✅ MySQL configuration found`);
        } else {
          this.warning(`  ⚠️  Unknown database format: ${dbUrl.substring(0, 20)}...`);
        }
      } else {
        this.error(`  ❌ DATABASE_URL missing in ${file}`);
      }

      // Check Redis configuration
      const redisUrl = env.REDIS_URL;
      if (redisUrl) {
        if (redisUrl.startsWith('redis://')) {
          this.success(`  ✅ Redis URL configured`);
        } else {
          this.warning(`  ⚠️  Invalid Redis URL format`);
        }
      } else {
        this.warning(`  ⚠️  REDIS_URL not configured in ${file}`);
      }
    });
  }

  validateSecurityConfiguration() {
    this.log('\n🛡️  Validating Security Configuration...', 'bold');
    
    Object.entries(this.envs).forEach(([file, env]) => {
      this.log(`\n📄 ${file}:`, 'cyan');
      
      // Check SECRET_KEY
      const secretKey = env.SECRET_KEY;
      if (secretKey) {
        if (secretKey.includes('change-in-production') || secretKey === 'dev-secret-key-change-in-production') {
          this.error(`  ❌ SECRET_KEY contains insecure placeholder in ${file}`);
        } else if (secretKey.length < 32) {
          this.warning(`  ⚠️  SECRET_KEY should be at least 32 characters long`);
        } else {
          this.success(`  ✅ SECRET_KEY is properly configured`);
        }
      } else {
        this.error(`  ❌ SECRET_KEY missing in ${file}`);
      }

      // Check CORS configuration
      const allowedOrigins = env.ALLOWED_ORIGINS || env.CORS_ORIGINS;
      if (allowedOrigins) {
        if (allowedOrigins.includes('localhost') && !allowedOrigins.includes('https://')) {
          this.warning(`  ⚠️  CORS includes localhost but may need production URLs`);
        } else {
          this.success(`  ✅ CORS configuration found`);
        }
      } else {
        this.warning(`  ⚠️  CORS configuration missing`);
      }
    });
  }

  validatePlatformSpecificConfig() {
    this.log('\n🚀 Validating Platform-Specific Configurations...', 'bold');
    
    // Vercel configuration
    if (this.envs['.env.vercel']) {
      this.log('\\n📄 Vercel Configuration:', 'cyan');
      const vercelEnv = this.envs['.env.vercel'];
      
      if (vercelEnv.MAX_ANALYSIS_TIME && parseInt(vercelEnv.MAX_ANALYSIS_TIME) > 30) {
        this.warning('  ⚠️  Vercel MAX_ANALYSIS_TIME should be ≤30 seconds for serverless limits');
      } else {
        this.success('  ✅ Vercel timeout configuration appropriate');
      }
      
      if (vercelEnv.ENABLE_CHART_GENERATION === 'true') {
        this.warning('  ⚠️  Chart generation enabled on Vercel (consider external service)');
      } else {
        this.success('  ✅ Chart generation appropriately configured for Vercel');
      }
    }

    // Railway configuration
    if (this.envs['.env.railway']) {
      this.log('\\n📄 Railway Configuration:', 'cyan');
      const railwayEnv = this.envs['.env.railway'];
      
      if (railwayEnv.ENABLE_CHART_GENERATION === 'true') {
        this.success('  ✅ Chart generation enabled (Railway supports full features)');
      }
      
      if (railwayEnv.RAILWAY_STATIC_URL) {
        this.success('  ✅ Railway static URL configured');
      }
    }

    // Check for platform detection
    const mainEnv = this.envs['.env'] || {};
    if (mainEnv.VERCEL || mainEnv.RAILWAY_ENVIRONMENT) {
      this.success('  ✅ Platform detection variables present');
    } else {
      this.log('  ℹ️  No platform detection variables (normal for local development)', 'blue');
    }
  }

  validateServiceUrls() {
    this.log('\n🌐 Validating Service URLs...', 'bold');
    
    Object.entries(this.envs).forEach(([file, env]) => {
      if (file === '.env.example') return;
      
      this.log(`\\n📄 ${file}:`, 'cyan');
      
      const urls = [
        'FRONTEND_URL',
        'PYTHON_SERVICE_URL',
        'FASTAPI_BASE_URL'
      ];

      urls.forEach(urlKey => {
        const url = env[urlKey];
        if (url) {
          try {
            new URL(url);
            if (url.includes('localhost') || url.includes('127.0.0.1')) {
              this.log(`  ℹ️  ${urlKey}: Local development URL`, 'blue');
            } else {
              this.success(`  ✅ ${urlKey}: Production URL configured`);
            }
          } catch (error) {
            this.error(`  ❌ ${urlKey}: Invalid URL format - ${url}`);
          }
        } else {
          this.warning(`  ⚠️  ${urlKey} not configured`);
        }
      });
    });
  }

  validateFeatureFlags() {
    this.log('\n🏁 Validating Feature Flags...', 'bold');
    
    const mainEnv = this.envs['.env'] || {};
    const features = [
      'SAFLA_ENABLED',
      'SECURITY_HEADERS_ENABLED',
      'RATE_LIMITING_ENABLED',
      'CIRCUIT_BREAKER_ENABLED',
      'ENABLE_PERFORMANCE_TRACKING',
      'ENABLE_CORRELATION_ANALYSIS',
      'ENABLE_CHART_GENERATION'
    ];

    features.forEach(feature => {
      const value = mainEnv[feature];
      if (value === 'true') {
        this.success(`  ✅ ${feature} enabled`);
      } else if (value === 'false') {
        this.log(`  ℹ️  ${feature} disabled`, 'blue');
      } else {
        this.warning(`  ⚠️  ${feature} not configured (defaulting to false)`);
      }
    });
  }

  generateReport() {
    this.log('\n' + '='.repeat(60), 'bold');
    this.log('🏥 CONFIGURATION VALIDATION REPORT', 'bold');
    this.log('='.repeat(60), 'bold');
    
    this.log(`\\n📊 Summary:`, 'bold');
    this.log(`  ✅ Passed: ${this.passed.length}`, 'green');
    this.log(`  ⚠️  Warnings: ${this.warnings.length}`, 'yellow');
    this.log(`  ❌ Errors: ${this.errors.length}`, 'red');

    if (this.errors.length > 0) {
      this.log(`\\n❌ Critical Issues (Must Fix):`, 'red');
      this.errors.forEach(error => this.log(`  ${error}`, 'red'));
    }

    if (this.warnings.length > 0) {
      this.log(`\\n⚠️  Warnings (Recommended to Fix):`, 'yellow');
      this.warnings.forEach(warning => this.log(`  ${warning}`, 'yellow'));
    }

    // Deployment readiness
    this.log(`\\n🚀 Deployment Readiness:`, 'bold');
    if (this.errors.length === 0) {
      this.log(`  ✅ Configuration is deployment ready!`, 'green');
    } else {
      this.log(`  ❌ Fix ${this.errors.length} critical issues before deploying`, 'red');
    }

    // Platform-specific recommendations
    this.log(`\\n💡 Platform Recommendations:`, 'bold');
    this.log(`  🔹 Vercel: Use external services for databases and long-running tasks`);
    this.log(`  🔹 Railway: Can host full-stack including databases`);
    this.log(`  🔹 Local: Use SQLite for development, PostgreSQL for production`);
    
    this.log(`\\n📚 Next Steps:`, 'bold');
    this.log(`  1. Fix all critical errors (❌)`);
    this.log(`  2. Address warnings for production (⚠️)`);
    this.log(`  3. Set environment variables in deployment platform`);
    this.log(`  4. Test API connections before deploying`);
    this.log(`  5. Run 'npm run health-check' to validate services`);

    return this.errors.length === 0;
  }

  validate() {
    this.log('🔍 Starting Environment Configuration Validation...', 'bold');
    
    this.validateApiKeys();
    this.validateDatabaseConfiguration();
    this.validateSecurityConfiguration();
    this.validatePlatformSpecificConfig();
    this.validateServiceUrls();
    this.validateFeatureFlags();
    
    return this.generateReport();
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new EnvironmentValidator();
  const isValid = validator.validate();
  process.exit(isValid ? 0 : 1);
}

module.exports = EnvironmentValidator;