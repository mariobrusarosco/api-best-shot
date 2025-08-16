#!/bin/bash

# Google Cloud Platform Setup Validation Script
# Validates GCP project configuration, secrets, and Cloud Run services
# Usage: ./scripts/validate-gcp-setup.sh [environment]

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
    echo -e "${BLUE}☁️  GCP Setup Validation${NC}"
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

# Check if gcloud is installed and configured
check_gcloud_setup() {
    print_info "Checking gcloud CLI setup..."
    
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI is not installed"
        print_info "Install from: https://cloud.google.com/sdk/docs/install"
        return 1
    fi
    
    print_success "gcloud CLI is installed"
    
    # Check authentication
    local active_account=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n1)
    if [[ -z "$active_account" ]]; then
        print_error "gcloud is not authenticated"
        print_info "Run: gcloud auth login"
        return 1
    fi
    
    print_success "Authenticated as: $active_account"
    
    # Check current project
    local current_project=$(gcloud config get-value project 2>/dev/null)
    if [[ -z "$current_project" ]]; then
        print_warning "No default project set"
        print_info "Run: gcloud config set project YOUR_PROJECT_ID"
    else
        print_success "Current project: $current_project"
    fi
    
    return 0
}

# Validate GCP project and services
check_gcp_project() {
    local environment=$1
    local errors=0
    
    print_info "Validating GCP project configuration..."
    
    # Determine expected project based on environment
    local expected_project
    case "$environment" in
        "demo")
            expected_project="api-best-shot-demo"
            ;;
        "staging")
            expected_project="api-best-shot-staging"
            ;;
        "production")
            expected_project="api-best-shot-production"
            ;;
        *)
            print_warning "Unknown environment '$environment' - skipping project validation"
            return 0
            ;;
    esac
    
    # Check if we're in the right project
    local current_project=$(gcloud config get-value project 2>/dev/null)
    if [[ "$current_project" != "$expected_project" ]]; then
        print_warning "Current project ($current_project) doesn't match expected ($expected_project)"
        print_info "Switch with: gcloud config set project $expected_project"
    else
        print_success "Using correct project: $expected_project"
    fi
    
    # Check if required APIs are enabled
    print_info "Checking required GCP APIs..."
    
    local required_apis=(
        "run.googleapis.com"
        "cloudbuild.googleapis.com"
        "secretmanager.googleapis.com"
        "logging.googleapis.com"
    )
    
    for api in "${required_apis[@]}"; do
        if gcloud services list --enabled --filter="name:$api" --format="value(name)" | grep -q "$api"; then
            print_success "API enabled: $api"
        else
            print_error "API not enabled: $api"
            print_info "Enable with: gcloud services enable $api"
            ((errors++))
        fi
    done
    
    return $errors
}

# Check Cloud Run services
check_cloud_run_services() {
    local environment=$1
    
    print_info "Checking Cloud Run services..."
    
    local expected_service
    case "$environment" in
        "demo")
            expected_service="api-best-shot-demo"
            ;;
        "staging")
            expected_service="api-best-shot-staging"
            ;;
        "production")
            expected_service="api-best-shot-production"
            ;;
        *)
            print_warning "Unknown environment '$environment' - skipping Cloud Run validation"
            return 0
            ;;
    esac
    
    # List all Cloud Run services
    local services=$(gcloud run services list --format="value(metadata.name)")
    
    if echo "$services" | grep -q "^$expected_service$"; then
        print_success "Cloud Run service exists: $expected_service"
        
        # Get service details
        local service_url=$(gcloud run services describe "$expected_service" --region=us-east1 --format="value(status.url)" 2>/dev/null || echo "")
        if [[ -n "$service_url" ]]; then
            print_success "Service URL: $service_url"
        fi
        
        # Check service status
        local ready_condition=$(gcloud run services describe "$expected_service" --region=us-east1 --format="value(status.conditions[0].status)" 2>/dev/null || echo "Unknown")
        if [[ "$ready_condition" == "True" ]]; then
            print_success "Service is ready"
        else
            print_warning "Service status: $ready_condition"
        fi
    else
        print_error "Cloud Run service not found: $expected_service"
        print_info "Create the service first before running deployments"
        return 1
    fi
    
    return 0
}

# Check Secret Manager secrets
check_secret_manager() {
    local environment=$1
    
    print_info "Checking Secret Manager secrets..."
    
    # Required secrets based on environment
    local required_secrets=(
        "jwt-secret"
        "sentry-dsn"
        "aws-access-key"
        "aws-secret-key"
        "internal-service-token"
    )
    
    # Add environment-specific database secret
    case "$environment" in
        "demo")
            required_secrets+=("db-connection-demo")
            ;;
        "staging")
            required_secrets+=("db-connection-staging")
            ;;
        "production")
            required_secrets+=("db-connection-production")
            ;;
    esac
    
    local missing_secrets=()
    
    for secret in "${required_secrets[@]}"; do
        if gcloud secrets describe "$secret" &> /dev/null; then
            print_success "Secret exists: $secret"
            
            # Check if secret has any versions
            local versions=$(gcloud secrets versions list "$secret" --format="value(name)" | wc -l)
            if [[ $versions -gt 0 ]]; then
                print_success "Secret '$secret' has $versions version(s)"
            else
                print_warning "Secret '$secret' has no versions"
            fi
        else
            print_error "Secret missing: $secret"
            missing_secrets+=("$secret")
        fi
    done
    
    if [[ ${#missing_secrets[@]} -gt 0 ]]; then
        print_error "Missing secrets: ${missing_secrets[*]}"
        print_info "Create secrets manually in Google Cloud Console"
        print_info "See: docs/plan/environment-setup-guide.md"
        return 1
    fi
    
    return 0
}

# Check IAM permissions
check_iam_permissions() {
    print_info "Checking IAM permissions..."
    
    # Get the compute engine default service account
    local project_number=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")
    local compute_sa="${project_number}-compute@developer.gserviceaccount.com"
    
    print_success "Compute service account: $compute_sa"
    
    # Check if the service account has Secret Manager access
    local secrets=$(gcloud secrets list --format="value(name)" | head -1)
    if [[ -n "$secrets" ]]; then
        local first_secret=$(echo "$secrets" | head -1)
        if gcloud secrets get-iam-policy "$first_secret" --format="json" | grep -q "$compute_sa"; then
            print_success "Service account has Secret Manager access"
        else
            print_warning "Service account may not have Secret Manager access"
            print_info "Grant access with the setup scripts if needed"
        fi
    fi
    
    return 0
}

# Main validation function
main() {
    local environment=${1:-"staging"}
    local errors=0
    
    print_header
    print_info "Validating GCP setup for environment: $environment"
    echo ""
    
    # Run all checks
    check_gcloud_setup || ((errors++))
    echo ""
    
    check_gcp_project "$environment" || ((errors++))
    echo ""
    
    check_cloud_run_services "$environment" || ((errors++))
    echo ""
    
    check_secret_manager "$environment" || ((errors++))
    echo ""
    
    check_iam_permissions || ((errors++))
    echo ""
    
    # Summary
    echo -e "${BLUE}================================${NC}"
    if [[ $errors -eq 0 ]]; then
        print_success "GCP setup validation passed! 🎉"
        echo ""
        print_info "Environment '$environment' is ready for deployment"
    else
        print_error "GCP setup validation failed with $errors error(s)"
        echo ""
        print_info "Please fix the above issues before proceeding"
        exit 1
    fi
    echo -e "${BLUE}================================${NC}"
}

# Run main function
main "$@"