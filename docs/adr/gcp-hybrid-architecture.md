# ADR: GCP Hybrid Architecture for Node.js API with Headless Browsers

## Status

**ACCEPTED** - January 2025

## Context

We have a Node.js API that includes headless browser functionality using Playwright for web scraping. Currently hosted on Railway, we're experiencing reliability issues:

- **Railway Issues**: Memory leaks, process crashes after first browser request, resource limitations
- **Infrastructure Challenges**: Containerized platforms struggle with headless browser workloads
- **Cost Concerns**: Want to minimize operational costs while maintaining reliability
- **Scalability Needs**: Need to handle varying browser workload demands

## Decision

We will migrate to a **GCP Hybrid Architecture** consisting of:

1. **Google Cloud Run** - Host main Node.js API (all non-browser endpoints)
2. **Google Cloud Functions** - Handle browser-intensive operations (`/data-provider/v2`)
3. **Hybrid Communication** - API Gateway pattern for seamless user experience

## Rationale

### Why GCP over AWS/Other Providers?

- **Superior Free Tier**: 2M requests/month vs AWS's 1M
- **Container Native**: Cloud Run designed for our Docker-based API
- **Memory Limits**: Up to 32GB per instance vs Railway's constraints
- **Serverless Browser Support**: Cloud Functions can handle Playwright workloads

### Why Hybrid Architecture?

- **Separation of Concerns**: Isolate browser operations from main API
- **Cost Optimization**: Pay only for heavy compute when needed
- **Fault Isolation**: Browser crashes don't affect main API
- **Independent Scaling**: Scale each component based on demand

### Why Avoid Browserless.io?

- **Cost Control**: Avoid external service costs
- **Full Control**: Maintain complete control over browser configuration
- **No Vendor Lock-in**: Keep all infrastructure self-managed
- **Learning Opportunity**: Gain expertise in serverless browser patterns

## Implementation Strategy

### Phase 1: Foundation

- Set up GCP project and services
- Learn GCP tooling and deployment patterns
- Create containerized version of main API

### Phase 2: API Migration

- Deploy main API to Cloud Run
- Migrate all non-browser endpoints
- Implement proper logging and monitoring

### Phase 3: Browser Function

- Extract browser logic to Cloud Functions
- Implement serverless Playwright patterns
- Create API Gateway communication layer

### Phase 4: Production Optimization

- Performance tuning and monitoring
- Error handling and retry logic
- Cost optimization and scaling configuration

## Consequences

### Positive

- **Zero Infrastructure Management**: GCP handles scaling and reliability
- **Cost Effective**: Generous free tier, pay-per-use model
- **Educational Value**: Learn enterprise-grade cloud patterns
- **Improved Reliability**: No more Railway browser crashes
- **Better Separation**: Clean architecture with isolated concerns

### Negative

- **Learning Curve**: Team needs to learn GCP tooling
- **Migration Effort**: Requires code restructuring and redeployment
- **Complexity**: More moving parts than single-platform solution
- **Cold Starts**: Cloud Functions may have initial latency

### Risks and Mitigations

- **Risk**: GCP service changes/pricing
  - **Mitigation**: Architecture is portable, can migrate to other providers
- **Risk**: Cold start latency for browser functions
  - **Mitigation**: Implement warming strategies, optimize function size
- **Risk**: Debugging complexity in distributed system
  - **Mitigation**: Comprehensive logging, monitoring, and tracing

## Success Metrics

- **Reliability**: Zero browser-related API crashes
- **Cost**: Stay within GCP free tier for development/light production
- **Performance**: <5 second response times for browser operations
- **Scalability**: Handle 10x current traffic without infrastructure changes
- **Developer Experience**: Faster development cycle with better tooling

## Related Decisions

- [Unit Testing Framework](./unit-testing-framework.md)
- [Playwright Production Deployment](./playwright-production-deployment.md)

## Implementation Timeline

- **Week 1**: GCP setup and learning
- **Week 2**: Main API migration to Cloud Run
- **Week 3**: Browser function development and testing
- **Week 4**: Production deployment and optimization

## Review Date

This decision should be reviewed in **6 months** (July 2025) to assess:

- Cost effectiveness vs alternatives
- Performance and reliability metrics
- Team satisfaction with GCP tooling
- Scalability requirements evolution
