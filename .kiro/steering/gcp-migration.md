---
description: GCP migration guidelines and standards
globs: 
inclusion: fileMatch
fileMatchPattern: "**/gcp-*"
---

# GCP Migration Guidelines

## Architecture Principles

### Hybrid Cloud Strategy
- **Cloud Run** for main API services (replacing Railway)
- **Cloud Functions** for browser operations (Playwright isolation)
- **Hybrid approach** to prevent browser-related crashes
- Maintain existing PostgreSQL database during transition

### Performance Targets
- Response times: <5 seconds for browser operations
- Scalability: Handle 10x current traffic without infrastructure changes
- Reliability: Zero browser-related API crashes
- Cost: Stay within GCP free tier for development/light production

## Migration Phases

### Phase-Based Approach
1. **Week 1**: GCP setup and learning
2. **Week 2**: Main API migration to Cloud Run
3. **Week 3**: Browser function development and testing
4. **Week 4**: Production deployment and optimization

### Risk Mitigation
- Keep Railway deployment available during transition
- Document rollback procedures for each phase
- Test rollback scenarios in development
- Monitor system for 1 week post-deployment

## Cloud Run Optimization

### Container Configuration
- Use multi-stage Docker builds (already implemented)
- Optimize for cold start performance
- Configure proper scaling parameters
- Implement health checks for container orchestration

### Environment Management
- Support multiple environments (demo/production)
- Secure environment variable handling
- Database connection fallback for testing
- Proper IAM roles and permissions

## Cloud Functions Best Practices

### Browser Operations
- Isolate Playwright operations in separate functions
- Implement proper timeout and retry logic
- Optimize function memory and execution time
- Add circuit breaker patterns for resilience

### Monitoring & Observability
- Comprehensive logging across all services
- Performance dashboards and custom metrics
- Alerting for critical failures and cost overruns
- Request correlation IDs for debugging

## Success Criteria

### Validation Checklist
- [ ] **Reliability**: Zero browser-related crashes for 48 hours
- [ ] **Performance**: All endpoints respond within target times
- [ ] **Cost**: Deployment stays within expected budget
- [ ] **Monitoring**: All critical metrics being tracked
- [ ] **Documentation**: Complete operational documentation
- [ ] **Rollback Plan**: Documented rollback procedures