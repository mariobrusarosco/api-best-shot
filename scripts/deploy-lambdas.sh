#!/bin/bash

# AWS Lambda Deployment Script
# Usage: ./scripts/deploy-lambdas.sh [function-name] [--layers-only] [--functions-only]

set -e

# Configuration
AWS_REGION=${AWS_REGION:-"us-east-1"}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LAMBDAS_DIR="$PROJECT_ROOT/src/lambdas"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed"
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS CLI is not configured or credentials are invalid"
        exit 1
    fi
    
    local account_id=$(aws sts get-caller-identity --query Account --output text)
    log_info "Using AWS account: $account_id"
}

deploy_layer() {
    local layer_name=$1
    local layer_dir="$LAMBDAS_DIR/layers/$layer_name"
    
    if [[ ! -d "$layer_dir" ]]; then
        log_error "Layer directory not found: $layer_dir"
        return 1
    fi
    
    if [[ ! -f "$layer_dir/nodejs.zip" ]]; then
        log_error "Layer zip file not found: $layer_dir/nodejs.zip"
        log_warning "Please build the layer first"
        return 1
    fi
    
    log_info "Deploying layer: $layer_name"
    
    local version=$(aws lambda publish-layer-version \
        --layer-name "$layer_name" \
        --description "$layer_name layer - deployed $(date)" \
        --zip-file "fileb://$layer_dir/nodejs.zip" \
        --compatible-runtimes nodejs18.x nodejs20.x \
        --region "$AWS_REGION" \
        --query 'Version' --output text)
    
    log_success "Layer $layer_name deployed as version $version"
    echo "$version"
}

deploy_function() {
    local function_name=$1
    local function_file="$LAMBDAS_DIR/$function_name.mjs"
    local zip_file="/tmp/$function_name.zip"
    
    if [[ ! -f "$function_file" ]]; then
        log_error "Function file not found: $function_file"
        return 1
    fi
    
    log_info "Creating deployment package for: $function_name"
    
    # Create zip file using Python (more reliable than zip command)
    cd "$LAMBDAS_DIR"
    python3 -c "
import zipfile
import sys
with zipfile.ZipFile('$zip_file', 'w') as z:
    z.write('$function_name.mjs')
print('Created zip file: $zip_file')
"
    
    log_info "Updating function code: $function_name"
    
    aws lambda update-function-code \
        --function-name "$function_name" \
        --zip-file "fileb://$zip_file" \
        --region "$AWS_REGION" > /dev/null
    
    log_success "Function $function_name code updated"
    
    # Wait for function to be active
    log_info "Waiting for function to be active..."
    aws lambda wait function-updated \
        --function-name "$function_name" \
        --region "$AWS_REGION"
    
    # Clean up
    rm -f "$zip_file"
    
    log_success "Function $function_name is ready"
}

update_function_layers() {
    local function_name=$1
    
    log_info "Updating layers for function: $function_name"
    
    # Get latest layer versions
    local main_layer_arn=$(aws lambda list-layer-versions \
        --layer-name best-shot-main \
        --query 'LayerVersions[0].LayerVersionArn' \
        --output text --region "$AWS_REGION")
    
    local sentry_layer_arn=$(aws lambda list-layer-versions \
        --layer-name sentry \
        --query 'LayerVersions[0].LayerVersionArn' \
        --output text --region "$AWS_REGION")
    
    if [[ "$main_layer_arn" == "None" || "$sentry_layer_arn" == "None" ]]; then
        log_error "Could not find required layers"
        return 1
    fi
    
    # Update function configuration
    aws lambda update-function-configuration \
        --function-name "$function_name" \
        --layers "$main_layer_arn" "$sentry_layer_arn" \
        --region "$AWS_REGION" > /dev/null
    
    log_success "Updated layers for $function_name"
    log_info "  Main layer: $main_layer_arn"
    log_info "  Sentry layer: $sentry_layer_arn"
}

show_function_status() {
    local function_name=$1
    
    log_info "Function status for: $function_name"
    
    aws lambda get-function-configuration \
        --function-name "$function_name" \
        --region "$AWS_REGION" \
        --query '{FunctionName:FunctionName,LastModified:LastModified,State:State,Runtime:Runtime,CodeSize:CodeSize}' \
        --output table
}

# Main execution
main() {
    local deploy_layers=true
    local deploy_functions=true
    local specific_function=""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --layers-only)
                deploy_functions=false
                shift
                ;;
            --functions-only)
                deploy_layers=false
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [function-name] [--layers-only] [--functions-only]"
                echo ""
                echo "Options:"
                echo "  function-name     Deploy specific function only"
                echo "  --layers-only     Deploy only Lambda layers"
                echo "  --functions-only  Deploy only Lambda functions"
                echo "  --help, -h        Show this help message"
                echo ""
                echo "Examples:"
                echo "  $0                                    # Deploy all layers and functions"
                echo "  $0 caller-scores-and-standings       # Deploy specific function"
                echo "  $0 --layers-only                     # Deploy only layers"
                echo "  $0 --functions-only                  # Deploy only functions"
                exit 0
                ;;
            *)
                specific_function=$1
                shift
                ;;
        esac
    done
    
    log_info "🚀 Starting Lambda deployment"
    check_aws_cli
    
    # Deploy layers
    if [[ "$deploy_layers" == true ]]; then
        log_info "📦 Deploying Lambda layers..."
        deploy_layer "best-shot-main"
        deploy_layer "sentry"
        log_success "All layers deployed"
    fi
    
    # Deploy functions
    if [[ "$deploy_functions" == true ]]; then
        log_info "⚡ Deploying Lambda functions..."
        
        local functions=()
        if [[ -n "$specific_function" ]]; then
            functions=("$specific_function")
        else
            functions=("caller-scores-and-standings" "caller-knockouts-update")
        fi
        
        for func in "${functions[@]}"; do
            if deploy_function "$func"; then
                if [[ "$deploy_layers" == true ]]; then
                    update_function_layers "$func"
                fi
                show_function_status "$func"
            else
                log_error "Failed to deploy function: $func"
            fi
        done
        
        log_success "All functions deployed"
    fi
    
    log_success "🎉 Lambda deployment completed successfully!"
}

# Run main function
main "$@"