#!/bin/bash

# Production Migration Deployment Script
# AutoGen Financial Intelligence Demo - Database Schema Deployment
#
# This script safely deploys Prisma migrations to production environments
# with proper validation, backup verification, and rollback procedures.

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-production}"
DRY_RUN="${2:-false}"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Validate environment
validate_environment() {
    log "Validating deployment environment: $ENVIRONMENT"

    # Check required environment variables
    local required_vars=("DATABASE_URL")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Required environment variable $var is not set"
        fi
    done

    # Validate DATABASE_URL format
    if [[ ! "$DATABASE_URL" =~ ^postgresql:// ]]; then
        error "DATABASE_URL must be a PostgreSQL connection string"
    fi

    # Check if this is a production database
    if [[ "$DATABASE_URL" =~ (localhost|127\.0\.0\.1|\.local) ]]; then
        warning "Database appears to be local - confirming this is not production"
        if [[ "$ENVIRONMENT" == "production" ]]; then
            error "Local database detected but ENVIRONMENT=production. Please verify configuration."
        fi
    fi

    success "Environment validation passed"
}

# Check Prisma CLI and dependencies
check_dependencies() {
    log "Checking dependencies..."

    # Check if we're in the right directory
    if [[ ! -f "$PROJECT_ROOT/prisma/schema.prisma" ]]; then
        error "Prisma schema not found. Please run from the web app root directory."
    fi

    # Check if node_modules exists
    if [[ ! -d "$PROJECT_ROOT/node_modules" ]]; then
        error "Node modules not found. Please run 'npm install' first."
    fi

    # Check Prisma CLI
    if ! command -v npx &> /dev/null; then
        error "npx not found. Please install Node.js and npm."
    fi

    success "Dependencies check passed"
}

# Backup verification
verify_backup() {
    log "Verifying backup availability..."

    # For Railway PostgreSQL, backups are automatic
    # We'll just warn the user to ensure backups are available
    warning "IMPORTANT: Ensure database backups are available before proceeding"
    warning "For Railway PostgreSQL, automatic backups should be enabled"

    if [[ "$DRY_RUN" == "false" ]]; then
        echo
        read -p "Have you verified that database backups are available? (y/N): " confirm
        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
            error "Please verify backup availability before proceeding"
        fi
    fi

    success "Backup verification acknowledged"
}

# Check migration status
check_migration_status() {
    log "Checking current migration status..."

    cd "$PROJECT_ROOT"

    # Get migration status
    local status_output
    if ! status_output=$(npx prisma migrate status 2>&1); then
        error "Failed to check migration status: $status_output"
    fi

    echo "$status_output"

    # Check if database is up to date
    if echo "$status_output" | grep -q "Database schema is up to date"; then
        warning "Database is already up to date. No migrations to apply."
        return 0
    fi

    # Check for pending migrations
    if echo "$status_output" | grep -q "migration found in prisma/migrations"; then
        success "Pending migrations detected"
        return 0
    fi

    error "Unexpected migration status"
}

# Deploy migrations
deploy_migrations() {
    log "Deploying migrations to $ENVIRONMENT..."

    cd "$PROJECT_ROOT"

    if [[ "$DRY_RUN" == "true" ]]; then
        warning "DRY RUN: Would execute 'npx prisma migrate deploy'"
        warning "DRY RUN: Would execute 'npx prisma generate'"
        return 0
    fi

    # Deploy migrations
    log "Applying migrations..."
    if ! npx prisma migrate deploy; then
        error "Migration deployment failed"
    fi

    # Generate Prisma client
    log "Generating Prisma client..."
    if ! npx prisma generate; then
        error "Prisma client generation failed"
    fi

    success "Migrations deployed successfully"
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."

    cd "$PROJECT_ROOT"

    # Check final migration status
    local status_output
    if ! status_output=$(npx prisma migrate status 2>&1); then
        error "Failed to verify migration status after deployment"
    fi

    if echo "$status_output" | grep -q "Database schema is up to date"; then
        success "Migration deployment verified - database is up to date"
    else
        error "Migration verification failed - database may not be properly migrated"
    fi

    # Test database connection
    log "Testing database connection..."
    if ! npx prisma db execute --stdin <<< "SELECT 1 as test;" > /dev/null 2>&1; then
        warning "Database connection test failed - please verify connectivity"
    else
        success "Database connection test passed"
    fi
}

# Main deployment function
main() {
    echo "=================================================="
    echo "🚀 AutoGen Database Migration Deployment"
    echo "=================================================="
    echo "Environment: $ENVIRONMENT"
    echo "Dry Run: $DRY_RUN"
    echo "Database: ${DATABASE_URL%%/*}/****" # Hide sensitive parts
    echo "=================================================="
    echo

    # Confirm production deployment
    if [[ "$ENVIRONMENT" == "production" && "$DRY_RUN" == "false" ]]; then
        warning "⚠️  PRODUCTION DEPLOYMENT DETECTED ⚠️"
        echo
        echo "This will apply database migrations to the production environment."
        echo "This action cannot be easily undone."
        echo
        read -p "Are you sure you want to proceed with production deployment? (y/N): " confirm
        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
            error "Production deployment cancelled by user"
        fi
        echo
    fi

    # Execute deployment steps
    validate_environment
    check_dependencies
    verify_backup
    check_migration_status
    deploy_migrations
    verify_deployment

    echo
    echo "=================================================="
    success "🎉 Migration deployment completed successfully!"
    echo "=================================================="

    # Post-deployment instructions
    echo
    echo "📋 Post-deployment checklist:"
    echo "  1. ✅ Database migrations applied"
    echo "  2. ✅ Prisma client generated"
    echo "  3. ⏳ Test application functionality"
    echo "  4. ⏳ Monitor application logs"
    echo "  5. ⏳ Verify data integrity"
    echo

    if [[ "$ENVIRONMENT" == "production" ]]; then
        echo "🔍 Production monitoring recommendations:"
        echo "  - Monitor application error rates"
        echo "  - Check database performance metrics"
        echo "  - Verify user authentication flows"
        echo "  - Test agent conversation creation"
        echo
    fi
}

# Handle script arguments
show_usage() {
    echo "Usage: $0 [ENVIRONMENT] [DRY_RUN]"
    echo
    echo "Arguments:"
    echo "  ENVIRONMENT  Target environment (default: production)"
    echo "               Options: development, staging, production"
    echo "  DRY_RUN      Perform dry run without applying changes (default: false)"
    echo "               Options: true, false"
    echo
    echo "Examples:"
    echo "  $0                          # Deploy to production"
    echo "  $0 staging                  # Deploy to staging"
    echo "  $0 production true          # Dry run for production"
    echo
    echo "Environment Variables Required:"
    echo "  DATABASE_URL                # PostgreSQL connection string"
    echo
}

# Validate arguments
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    show_usage
    exit 0
fi

if [[ "${1:-}" =~ ^(development|staging|production)$ ]]; then
    ENVIRONMENT="$1"
else
    if [[ -n "${1:-}" ]]; then
        error "Invalid environment: $1. Must be development, staging, or production."
    fi
fi

if [[ "${2:-}" =~ ^(true|false)$ ]]; then
    DRY_RUN="$2"
else
    if [[ -n "${2:-}" ]]; then
        error "Invalid dry run option: $2. Must be true or false."
    fi
fi

# Execute main function
main