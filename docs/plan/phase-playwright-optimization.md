# Phase: Playwright Architecture Optimization

## 🎯 **Context & Problem Statement**

Currently, the `/api/v2/data-provider/tournaments/create` endpoint uses Playwright for asset fetching, which creates several challenges:

- **Resource Intensive**: Each request spawns a full Chromium browser (50-100MB memory)
- **Memory Leaks**: Browser instances not properly cleaned up (fixed recently)
- **Performance**: 3-5 second response times per asset fetch
- **Scalability**: Poor scaling due to browser overhead
- **Necessity**: Required due to SofaScore's anti-bot protection mechanisms

## 🛡️ **Why Playwright is Necessary**

SofaScore implements sophisticated anti-bot protection:

- ❌ Blocks simple HTTP requests (Axios fails)
- ✅ Requires real browser environment
- ✅ Needs JavaScript execution context
- ✅ Must have proper browser fingerprints

## 🚀 **Solution Approaches**

### **Approach 1: Browser Instance Pooling** (Immediate)

- **Complexity**: Low
- **Impact**: High
- **Timeline**: 1-2 days
- **Benefits**: Reuse browser instances, reduce startup overhead

### **Approach 2: Google Cloud Functions** (Recommended)

- **Complexity**: Medium
- **Impact**: Very High
- **Timeline**: 1 week
- **Benefits**: Serverless scaling, resource isolation, clean architecture

### **Approach 3: Dedicated Asset Microservice** (Long-term)

- **Complexity**: High
- **Impact**: Very High
- **Timeline**: 2-3 weeks
- **Benefits**: Specialized service, independent scaling, better monitoring

### **Approach 4: Third-Party Scraping Service** (Alternative)

- **Complexity**: Low
- **Impact**: High
- **Timeline**: 3-5 days
- **Benefits**: Outsourced complexity, proven reliability

## 📋 **Implementation Plan**

### **Phase 1: Immediate Optimizations (Week 1)**

#### Task 1.1: Implement Browser Pooling

- [x] Create `PlaywrightPool` class with connection management
- [x] Implement browser instance reuse logic
- [x] Add proper cleanup and timeout handling
- [x] Update tournament creation endpoint to use pooling
- [x] Add monitoring/logging for pool performance

#### Task 1.2: Optimize Current Implementation

- [x] Add browser context reuse instead of full browser creation
- [x] Implement connection timeouts and retry logic
- [ ] Add response caching for repeated asset requests
- [x] Improve error handling and fallback mechanisms

### **Phase 2: Cloud Functions Migration (Week 2-3)**

#### Task 2.1: Cloud Function Development

- [ ] Create `playwright-asset-fetcher` Cloud Function
- [ ] Implement Playwright-based asset fetching logic
- [ ] Add S3 upload functionality within function
- [ ] Configure proper memory/timeout settings for Cloud Functions
- [ ] Add error handling and retry mechanisms

#### Task 2.2: API Integration

- [ ] Update `TournamentDataProviderService` to call Cloud Function
- [ ] Remove local Playwright dependency from main API
- [ ] Add fallback mechanism if Cloud Function fails
- [ ] Update environment configuration for Cloud Function URL
- [ ] Add monitoring and logging for Cloud Function calls

#### Task 2.3: Deployment & Testing

- [ ] Deploy Cloud Function to GCP
- [ ] Configure IAM permissions for S3 access
- [ ] Load test the new architecture
- [ ] Monitor performance improvements
- [ ] Update documentation

### **Phase 3: Performance Monitoring (Week 4)**

#### Task 3.1: Metrics & Monitoring

- [ ] Add performance metrics for asset fetching times
- [ ] Monitor memory usage improvements
- [ ] Track success/failure rates
- [ ] Set up alerts for Cloud Function errors
- [ ] Create performance dashboard

#### Task 3.2: Optimization Fine-tuning

- [ ] Analyze performance data
- [ ] Optimize Cloud Function configurations
- [ ] Implement additional caching if needed
- [ ] Fine-tune retry/timeout settings

## 🏗️ **Architecture Comparison**

| Approach            | Memory Usage | Response Time | Scalability | Complexity | Cost     |
| ------------------- | ------------ | ------------- | ----------- | ---------- | -------- |
| **Current**         | 50-100MB     | 3-5s          | Poor        | Low        | High     |
| **Browser Pool**    | 15-30MB      | 1-2s          | Better      | Low        | Medium   |
| **Cloud Functions** | 5-15MB       | 0.5-2s        | Excellent   | Medium     | Low      |
| **Microservice**    | 10-20MB      | 0.3-1s        | Excellent   | High       | Medium   |
| **Third-Party**     | 1-5MB        | 0.2-1s        | Excellent   | Low        | Variable |

## 📊 **Success Metrics**

- **Performance**: Reduce asset fetching time by 60-80%
- **Memory**: Reduce memory usage by 70-90%
- **Scalability**: Handle 10x more concurrent requests
- **Reliability**: 99.9% success rate for asset fetching
- **Cost**: Reduce infrastructure costs by 50-70%

## 🎯 **Priority Implementation**

### **Week 1 (Immediate)** ✅ COMPLETED

✅ Implement browser pooling optimization
✅ Fix existing resource leaks  
✅ Add proper error handling
✅ Update all v2 endpoints with proper resource cleanup

### **Week 2-3 (Strategic)**

🚀 Migrate to Google Cloud Functions architecture
🚀 Remove Playwright from main API
🚀 Implement proper asset pipeline

### **Week 4+ (Optimization)**

📊 Monitor and fine-tune performance
📊 Consider additional improvements
📊 Evaluate third-party alternatives

## 🔧 **Technical Requirements**

### Dependencies

- Google Cloud Functions runtime
- Playwright in Cloud Functions environment
- S3/CloudFront integration
- Proper IAM configuration

### Environment Variables

```bash
# Cloud Function
CLOUD_FUNCTION_ASSET_FETCHER_URL=https://...
GCP_PROJECT_ID=your-project
GCP_REGION=us-central1

# Existing S3 vars (already configured)
AWS_BUCKET_NAME=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_CLOUDFRONT_URL=...
```

## 📚 **Documentation Updates Required**

- [ ] Update API documentation for new architecture
- [ ] Create Cloud Functions deployment guide
- [ ] Update local development setup instructions
- [ ] Add troubleshooting guide for asset fetching
- [ ] Document performance monitoring procedures

---

**Phase Owner**: Development Team  
**Start Date**: TBD  
**Target Completion**: 4 weeks  
**Priority**: High  
**Dependencies**: GCP setup, S3 configuration
