#!/bin/bash

# Secret Validation Script
# Validates that all required secrets are properly configured
# Usage: ./scripts/validate-secrets.sh [environment]
# Environment: local, demo, staging (optional, defaults to auto-detect)

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}🔐 Secret Validation Script${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Validation functions
check_secret_exists() {
    local secret_name=$1
    local secret_value=$2
    local required=${3:-true}
    
    if [[ -n "$secret_value" && "$secret_value" != "placeholder"* ]]; then
        print_success "$secret_name is configured"
        return 0
    elif [[ "$required" == "true" ]]; then
        print_error "$secret_name is missing or invalid"
        return 1
    else
        print_warning "$secret_name is not configured (optional)"
        return 0
    fi
}

test_database_connection() {
    local connection_string=$1
    local env_name=$2
    
    if [[ -z "$connection_string" || "$connection_string" == "placeholder"* ]]; then
        print_error "Cannot test $env_name database - no connection string"
        return 1
    fi
    
    print_info "Testing $env_name database connection..."
    
    # Check if the connection string format is valid
    if [[ "$connection_string" =~ ^postgresql:// ]]; then
        print_success "$env_name database connection string format is valid"
        return 0
    else
        print_error "$env_name database connection string format is invalid"
        return 1
    fi
}

check_gcloud_secrets() {
    local environment=$1
    
    print_info "Checking Google Cloud Secret Manager..."
    
    # Check if gcloud is installed and authenticated
    if ! command -v gcloud &> /dev/null; then
        print_warning "gcloud CLI not found - skipping Google Cloud secret validation"
        return 0
    fi
    
    # Check if authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n1 &> /dev/null; then
        print_warning "gcloud not authenticated - skipping Google Cloud secret validation"
        return 0
    fi
    
    # List of secrets to check in Google Secret Manager
    local secrets=(
        "db-connection-$environment"
        "jwt-secret"
        "sentry-dsn"
        "aws-access-key"
        "aws-secret-key"
        "internal-service-token"
    )
    
    local missing_secrets=()
    
    for secret in "${secrets[@]}"; do
        if gcloud secrets describe "$secret" &> /dev/null; then
            print_success "Google Cloud secret '$secret' exists"
        else
            print_error "Google Cloud secret '$secret' is missing"
            missing_secrets+=("$secret")
        fi
    done
    
    if [[ ${#missing_secrets[@]} -eq 0 ]]; then
        print_success "All Google Cloud secrets are configured"
        return 0
    else
        print_error "Missing Google Cloud secrets: ${missing_secrets[*]}"
        return 1
    fi
}

# Main validation function
validate_environment() {
    local environment=${1:-"auto"}
    local errors=0
    
    print_header
    
    # Auto-detect environment if not specified
    if [[ "$environment" == "auto" ]]; then
        if [[ -n "$NODE_ENV" ]]; then
            environment=$NODE_ENV
            print_info "Auto-detected environment: $environment"
        else
            environment="local"
            print_info "Using default environment: local"
        fi
    else
        print_info "Validating environment: $environment"
    fi
    
    echo ""
    print_info "🔍 Checking local environment variables..."
    echo ""
    
    # Common secrets (always required)
    check_secret_exists "NODE_ENV" "$NODE_ENV" false
    
    # Environment-specific database connections
    case "$environment" in
        "local")
            # Local development - check for any valid database connection
            if [[ -n "$DB_STRING_CONNECTION" ]]; then
                check_secret_exists "DB_STRING_CONNECTION" "$DB_STRING_CONNECTION" || ((errors++))
                test_database_connection "$DB_STRING_CONNECTION" "local" || ((errors++))
            elif [[ -n "$DB_USER" && -n "$DB_PASSWORD" && -n "$DB_HOST" && -n "$DB_NAME" ]]; then
                print_success "Component-based database configuration found"
                check_secret_exists "DB_USER" "$DB_USER" || ((errors++))
                check_secret_exists "DB_PASSWORD" "$DB_PASSWORD" || ((errors++))
                check_secret_exists "DB_HOST" "$DB_HOST" || ((errors++))
                check_secret_exists "DB_NAME" "$DB_NAME" || ((errors++))
            else
                print_error "No database connection configured for local environment"
                ((errors++))
            fi
            ;;
            
        "demo")
            check_secret_exists "DB_STRING_CONNECTION_DEMO" "$DB_STRING_CONNECTION_DEMO" || ((errors++))
            test_database_connection "$DB_STRING_CONNECTION_DEMO" "demo" || ((errors++))
            ;;
            
        "staging")
            check_secret_exists "DB_STRING_CONNECTION_STAGING" "$DB_STRING_CONNECTION_STAGING" || ((errors++))
            test_database_connection "$DB_STRING_CONNECTION_STAGING" "staging" || ((errors++))
            ;;
            
        "production")
            check_secret_exists "DB_STRING_CONNECTION_PRODUCTION" "$DB_STRING_CONNECTION_PRODUCTION" || ((errors++))
            test_database_connection "$DB_STRING_CONNECTION_PRODUCTION" "production" || ((errors++))
            ;;
            
        *)
            print_error "Unknown environment: $environment"
            ((errors++))
            ;;
    esac
    
    echo ""
    
    # Check Google Cloud secrets (only for non-local environments)
    if [[ "$environment" != "local" ]]; then
        check_gcloud_secrets "$environment" || ((errors++))
        echo ""
    fi
    
    # Summary
    echo -e "${BLUE}================================${NC}"
    if [[ $errors -eq 0 ]]; then
        print_success "All validations passed! ✨"
        echo ""
        print_info "Environment '$environment' is properly configured"
        print_info "Ready for deployment!"
    else
        print_error "Validation failed with $errors error(s)"
        echo ""
        print_info "Please fix the above issues before proceeding"
        print_info "See docs/plan/environment-setup-guide.md for help"
        exit 1
    fi
    echo -e "${BLUE}================================${NC}"
}

# Script entry point
main() {
    # Check if script is being sourced or executed
    if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
        validate_environment "$1"
    fi
}

# Run main function with all arguments
main "$@"