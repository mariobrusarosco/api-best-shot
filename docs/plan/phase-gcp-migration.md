# Phase Plan: GCP Hybrid Architecture Migration

## Project Overview

Migrate from Railway to GCP hybrid architecture for improved reliability and cost optimization.

**Target Architecture**: Cloud Run (main API) + Cloud Functions (browser operations)

**Timeline**: 4 weeks

**Success Criteria**: Zero browser crashes, stay within free tier, <5s response times

---

## Phase 1: GCP Foundation & Learning

**Duration**: Week 1
**Goal**: Set up GCP environment and learn essential tooling

### Prerequisites

- [ ] Google account created
- [ ] Credit card available for GCP verification
- [ ] Development environment ready

### Tasks

#### GCP Account Setup

- [ ] Create GCP account and enable billing
- [ ] Create new GCP project for the application
- [ ] Enable required APIs:
  - [ ] Cloud Run API
  - [ ] Cloud Functions API
  - [ ] Cloud Build API
  - [ ] Container Registry API
- [ ] Set up billing alerts and budgets

#### Local Development Setup

- [ ] Install Google Cloud SDK locally
- [ ] Configure gcloud CLI (`gcloud init`)
- [ ] Authenticate with GCP (`gcloud auth login`)
- [ ] Set default project (`gcloud config set project PROJECT_ID`)
- [ ] Test basic gcloud commands

#### Learning & Exploration

- [ ] Complete GCP Cloud Run quickstart tutorial
- [ ] Complete GCP Cloud Functions quickstart tutorial
- [ ] Understand GCP IAM and service accounts
- [ ] Learn gcloud deployment commands
- [ ] Review GCP monitoring and logging

#### Environment Configuration

- [ ] Create development environment variables
- [ ] Set up local .env for GCP configuration
- [ ] Plan environment variable strategy for cloud deployment
- [ ] Document GCP resource naming conventions

### Deliverables

- [ ] Functional GCP project with enabled services
- [ ] Local development environment configured
- [ ] Basic understanding of GCP tooling
- [ ] Environment configuration strategy

---

## Phase 2: Main API Migration to Cloud Run

**Duration**: Week 2
**Goal**: Deploy core API (without browser operations) to Cloud Run

### Prerequisites

- [ ] Phase 1 completed
- [ ] Current API running locally
- [ ] Understanding of existing API structure

### Tasks

#### Code Preparation

- [ ] Audit current API endpoints and identify browser dependencies
- [ ] Temporarily disable/mock browser endpoints (`/data-provider/v2`)
- [ ] Ensure API works without browser functionality
- [ ] Update environment variable handling for GCP
- [ ] Add health check endpoint optimized for Cloud Run

#### Containerization

- [ ] Create optimized Dockerfile for production
- [ ] Add .dockerignore file
- [ ] Test Docker build locally
- [ ] Optimize image size and layers
- [ ] Ensure proper signal handling for graceful shutdowns

#### Cloud Run Deployment

- [ ] Build and push image to GCP Container Registry
- [ ] Deploy to Cloud Run with basic configuration
- [ ] Configure environment variables in Cloud Run
- [ ] Set up custom domain (if needed)
- [ ] Configure scaling settings (min/max instances)

#### Testing & Validation

- [ ] Test all non-browser endpoints in Cloud Run
- [ ] Verify database connectivity from Cloud Run
- [ ] Load test basic API endpoints
- [ ] Validate logging and monitoring
- [ ] Test environment variable access

#### Monitoring Setup

- [ ] Configure Cloud Run monitoring
- [ ] Set up logging aggregation
- [ ] Create basic dashboards
- [ ] Set up error alerting
- [ ] Monitor costs and usage

### Deliverables

- [ ] Main API running reliably on Cloud Run
- [ ] All non-browser endpoints functional
- [ ] Monitoring and logging operational
- [ ] Performance baseline established

---

## Phase 3: Browser Function Development

**Duration**: Week 3
**Goal**: Implement browser operations as Cloud Functions

### Prerequisites

- [ ] Phase 2 completed
- [ ] Understanding of current browser logic
- [ ] Cloud Functions environment ready

### Tasks

#### Browser Logic Extraction

- [ ] Identify all browser-dependent code in current API
- [ ] Extract browser logic from `/data-provider/v2` endpoints
- [ ] Create standalone browser function modules
- [ ] Design function input/output interfaces
- [ ] Plan error handling for serverless environment

#### Cloud Function Development

- [ ] Create Cloud Function project structure
- [ ] Install Playwright in Cloud Function environment
- [ ] Configure Playwright for serverless (headless, minimal args)
- [ ] Implement browser operations as functions
- [ ] Add proper error handling and timeouts

#### Function Deployment

- [ ] Deploy browser functions to GCP
- [ ] Configure function memory and timeout settings
- [ ] Set up environment variables for functions
- [ ] Test function deployment and execution
- [ ] Optimize function cold start time

#### API Gateway Implementation

- [ ] Modify main API to proxy browser requests to functions
- [ ] Implement request forwarding logic
- [ ] Add proper error handling for function failures
- [ ] Test end-to-end request flow
- [ ] Validate response format consistency

#### Integration Testing

- [ ] Test browser operations via Cloud Functions
- [ ] Verify data flow: API → Function → Database
- [ ] Test error scenarios and fallbacks
- [ ] Load test browser function performance
- [ ] Validate memory usage and cleanup

### Deliverables

- [ ] Browser operations running on Cloud Functions
- [ ] API Gateway pattern implemented
- [ ] End-to-end browser functionality working
- [ ] Performance metrics collected

---

## Phase 4: Production Optimization & Monitoring

**Duration**: Week 4
**Goal**: Optimize for production and implement comprehensive monitoring

### Prerequisites

- [ ] Phase 3 completed
- [ ] Basic monitoring in place
- [ ] Understanding of performance characteristics

### Tasks

#### Performance Optimization

- [ ] Optimize Cloud Function cold start times
- [ ] Implement function warming strategies
- [ ] Optimize Docker image size for Cloud Run
- [ ] Fine-tune Cloud Run scaling parameters
- [ ] Implement request timeout optimization

#### Error Handling & Resilience

- [ ] Implement retry logic for function failures
- [ ] Add circuit breaker patterns
- [ ] Create fallback mechanisms for browser failures
- [ ] Implement proper error logging and tracking
- [ ] Add request correlation IDs for debugging

#### Monitoring & Observability

- [ ] Set up comprehensive logging across all services
- [ ] Create performance dashboards
- [ ] Implement custom metrics collection
- [ ] Set up alerting for critical failures
- [ ] Configure cost monitoring and alerts

#### Security & Best Practices

- [ ] Review and implement security best practices
- [ ] Configure proper IAM roles and permissions
- [ ] Implement API rate limiting
- [ ] Add request validation and sanitization
- [ ] Review and secure environment variables

#### Documentation & Maintenance

- [ ] Create deployment documentation
- [ ] Document monitoring and alerting procedures
- [ ] Create troubleshooting guides
- [ ] Set up automated backup procedures
- [ ] Plan maintenance and update procedures

### Deliverables

- [ ] Production-ready GCP hybrid architecture
- [ ] Comprehensive monitoring and alerting
- [ ] Documentation for operations and maintenance
- [ ] Performance benchmarks and optimization

---

## Success Criteria Validation

### Final Checklist

- [ ] **Reliability**: Zero browser-related crashes for 48 hours
- [ ] **Performance**: All endpoints respond within target times
- [ ] **Cost**: Deployment stays within expected budget
- [ ] **Monitoring**: All critical metrics being tracked
- [ ] **Documentation**: Complete operational documentation
- [ ] **Rollback Plan**: Documented rollback procedures

### Post-Migration Tasks

- [ ] Monitor system for 1 week post-deployment
- [ ] Collect performance and cost metrics
- [ ] Update README.md with new architecture
- [ ] Schedule first monthly review
- [ ] Plan next iteration improvements

---

## Risk Mitigation

### High Priority Risks

- [ ] **Function timeout issues**: Implement proper timeouts and retries
- [ ] **Cold start latency**: Pre-warm functions and optimize startup
- [ ] **Database connectivity**: Test and monitor DB connections
- [ ] **Cost overruns**: Monitor usage and set alerts

### Rollback Strategy

- [ ] Keep Railway deployment available during transition
- [ ] Document rollback procedures for each phase
- [ ] Test rollback scenarios in development
- [ ] Plan communication strategy for rollback events

---

## Notes & Learning Log

### Key Learnings

- [ ] Document major learning points from each phase
- [ ] Record optimization discoveries
- [ ] Note any architectural decisions made during implementation

### Issues & Solutions

- [ ] Track problems encountered and solutions
- [ ] Document any deviations from original plan
- [ ] Record performance optimization results
