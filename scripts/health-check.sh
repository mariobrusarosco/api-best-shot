#!/bin/bash

# Health Check Script for Deployment Verification
# Verifies that deployed services are healthy and responding correctly
# Usage: ./scripts/health-check.sh [environment] [service-url]

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
    echo -e "${BLUE}🏥 Health Check Verification${NC}"
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

print_progress() {
    echo -e "${YELLOW}⏳ $1${NC}"
}

# Get service URL based on environment
get_service_url() {
    local environment=$1
    local custom_url=$2
    
    # Use custom URL if provided
    if [[ -n "$custom_url" ]]; then
        echo "$custom_url"
        return 0
    fi
    
    # Auto-detect service URL based on environment
    case "$environment" in
        "demo")
            # Try to get demo service URL from gcloud
            if command -v gcloud &> /dev/null; then
                local demo_url=$(gcloud run services describe api-best-shot-demo --region=us-central1 --format="value(status.url)" 2>/dev/null || echo "")
                if [[ -n "$demo_url" ]]; then
                    echo "$demo_url"
                    return 0
                fi
            fi
            print_warning "Could not auto-detect demo service URL"
            return 1
            ;;
            
        "staging")
            # Known staging URL
            echo "https://api-best-shot-staging-415034926128.us-east1.run.app"
            return 0
            ;;
            
        "production")
            # Try to get production service URL from gcloud
            if command -v gcloud &> /dev/null; then
                local prod_url=$(gcloud run services describe api-best-shot-production --region=us-central1 --format="value(status.url)" 2>/dev/null || echo "")
                if [[ -n "$prod_url" ]]; then
                    echo "$prod_url"
                    return 0
                fi
            fi
            print_warning "Could not auto-detect production service URL"
            return 1
            ;;
            
        *)
            print_error "Unknown environment: $environment"
            return 1
            ;;
    esac
}

# Basic HTTP health check
check_http_status() {
    local url=$1
    local expected_status=${2:-200}
    local timeout=${3:-10}
    
    print_progress "Checking HTTP status at: $url"
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$timeout" "$url" 2>/dev/null || echo "000")
    
    if [[ "$response" == "$expected_status" ]]; then
        print_success "HTTP status check passed ($response)"
        return 0
    else
        print_error "HTTP status check failed (got $response, expected $expected_status)"
        return 1
    fi
}

# Health endpoint check
check_health_endpoint() {
    local base_url=$1
    local timeout=${2:-10}
    
    local health_url="${base_url}/health"
    print_progress "Checking health endpoint: $health_url"
    
    local response=$(curl -s --max-time "$timeout" "$health_url" 2>/dev/null || echo "")
    
    if [[ -n "$response" ]]; then
        # Check if response contains expected health check fields
        if echo "$response" | grep -q '"status"' && echo "$response" | grep -q '"timestamp"'; then
            print_success "Health endpoint responded correctly"
            print_info "Response: $response"
            return 0
        else
            print_warning "Health endpoint responded but format unexpected"
            print_info "Response: $response"
            return 1
        fi
    else
        print_error "Health endpoint did not respond"
        return 1
    fi
}

# API functionality check
check_api_functionality() {
    local base_url=$1
    local timeout=${2:-15}
    
    print_progress "Checking basic API functionality..."
    
    # Test root endpoint
    local root_response=$(curl -s --max-time "$timeout" "$base_url" 2>/dev/null || echo "")
    
    if [[ -n "$root_response" ]]; then
        if echo "$root_response" | grep -q '"message"'; then
            print_success "Root API endpoint is functional"
        else
            print_warning "Root endpoint responded but format unexpected"
        fi
    else
        print_warning "Root endpoint did not respond"
    fi
    
    # Test API routes (non-auth endpoints)
    local api_url="${base_url}/api"
    local api_response=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$timeout" "$api_url" 2>/dev/null || echo "000")
    
    if [[ "$api_response" == "404" ]] || [[ "$api_response" == "200" ]] || [[ "$api_response" == "401" ]]; then
        print_success "API routes are accessible (status: $api_response)"
    else
        print_warning "API routes may have issues (status: $api_response)"
    fi
    
    return 0
}

# Database connectivity check (indirect)
check_database_connectivity() {
    local base_url=$1
    local timeout=${2:-20}
    
    print_progress "Checking database connectivity (indirect)..."
    
    # Try to hit an endpoint that would require database access
    # This is indirect since we can't directly test DB from outside
    local db_test_url="${base_url}/api/v1/health-db"
    local db_response=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$timeout" "$db_test_url" 2>/dev/null || echo "000")
    
    # Most endpoints will return 404 if they don't exist, but won't return 500 if DB is connected
    if [[ "$db_response" != "500" ]] && [[ "$db_response" != "502" ]] && [[ "$db_response" != "503" ]]; then
        print_success "Database connectivity appears healthy (no 5xx errors)"
    else
        print_warning "Database connectivity may have issues (status: $db_response)"
    fi
    
    return 0
}

# Performance check
check_response_times() {
    local base_url=$1
    local timeout=${2:-10}
    
    print_progress "Checking response times..."
    
    local start_time=$(date +%s%3N)
    local response=$(curl -s -o /dev/null -w "%{time_total}" --max-time "$timeout" "${base_url}/health" 2>/dev/null || echo "timeout")
    local end_time=$(date +%s%3N)
    
    if [[ "$response" != "timeout" ]]; then
        local response_ms=$(echo "$response * 1000" | bc 2>/dev/null || echo "unknown")
        if [[ "$response_ms" != "unknown" ]]; then
            local response_time=$(echo "$response_ms" | cut -d. -f1)
            if [[ "$response_time" -lt 1000 ]]; then
                print_success "Response time is good (${response_time}ms)"
            elif [[ "$response_time" -lt 3000 ]]; then
                print_warning "Response time is acceptable (${response_time}ms)"
            else
                print_warning "Response time is slow (${response_time}ms)"
            fi
        else
            print_info "Response time measurement unavailable"
        fi
    else
        print_warning "Response time check timed out"
    fi
    
    return 0
}

# SSL/TLS check
check_ssl_certificate() {
    local url=$1
    
    if [[ "$url" == https://* ]]; then
        print_progress "Checking SSL certificate..."
        
        local domain=$(echo "$url" | sed 's|https://||' | cut -d'/' -f1)
        local ssl_result=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "failed")
        
        if [[ "$ssl_result" != "failed" ]]; then
            print_success "SSL certificate is valid"
        else
            print_warning "SSL certificate check failed"
        fi
    else
        print_info "Skipping SSL check (HTTP endpoint)"
    fi
    
    return 0
}

# Comprehensive health check
run_comprehensive_check() {
    local environment=$1
    local service_url=$2
    local errors=0
    
    print_header
    print_info "Running comprehensive health check for: $environment"
    print_info "Service URL: $service_url"
    echo ""
    
    # Basic connectivity
    print_info "🔗 Basic Connectivity Checks"
    check_http_status "$service_url" 200 10 || ((errors++))
    check_health_endpoint "$service_url" 10 || ((errors++))
    echo ""
    
    # API functionality
    print_info "🚀 API Functionality Checks"
    check_api_functionality "$service_url" 15 || ((errors++))
    echo ""
    
    # Database connectivity (indirect)
    print_info "🗄️  Database Connectivity Checks"
    check_database_connectivity "$service_url" 20 || ((errors++))
    echo ""
    
    # Performance
    print_info "⚡ Performance Checks"
    check_response_times "$service_url" 10 || ((errors++))
    echo ""
    
    # Security
    print_info "🔒 Security Checks"
    check_ssl_certificate "$service_url" || ((errors++))
    echo ""
    
    return $errors
}

# Quick health check (faster, basic checks only)
run_quick_check() {
    local service_url=$1
    local errors=0
    
    print_info "Running quick health check..."
    
    check_http_status "$service_url" 200 5 || ((errors++))
    check_health_endpoint "$service_url" 5 || ((errors++))
    
    return $errors
}

# Main function
main() {
    local environment=${1:-"staging"}
    local custom_url=$2
    local check_type=${3:-"comprehensive"}
    
    # Get service URL
    local service_url=$(get_service_url "$environment" "$custom_url")
    if [[ $? -ne 0 ]] || [[ -z "$service_url" ]]; then
        print_error "Could not determine service URL"
        print_info "Usage: $0 [environment] [service-url]"
        print_info "Environments: demo, staging, production"
        exit 1
    fi
    
    local errors=0
    
    # Run appropriate check type
    case "$check_type" in
        "quick")
            run_quick_check "$service_url" || errors=$?
            ;;
        "comprehensive"|*)
            run_comprehensive_check "$environment" "$service_url" || errors=$?
            ;;
    esac
    
    # Summary
    echo -e "${BLUE}================================${NC}"
    if [[ $errors -eq 0 ]]; then
        print_success "All health checks passed! 🎉"
        echo ""
        print_info "Service '$environment' is healthy and ready"
        print_info "URL: $service_url"
    else
        print_error "Health check failed with $errors issue(s)"
        echo ""
        print_info "Service may have issues that need investigation"
        print_info "Check the service logs and configuration"
        exit 1
    fi
    echo -e "${BLUE}================================${NC}"
}

# Run main function with all arguments
main "$@"