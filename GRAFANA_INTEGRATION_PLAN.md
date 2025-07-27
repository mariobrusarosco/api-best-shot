# Grafana Cloud Integration Plan (Simplified)
**API Best Shot - Monitoring & Visualization Setup**

## Overview
Use Grafana Cloud to visualize Google Cloud Operations data instead of replacing the logging infrastructure. This approach leverages Google's native logging while adding powerful dashboards and alerting.

**Target**: Free tier limits (50GB logs/month, 10K metrics series, 14-day retention)
**Strategy**: Google Cloud Operations + Grafana Cloud (visualization layer)

---

## ✅ Completed: Logging Optimization

- [x] ~~Remove BetterStack dependencies~~ 
- [x] ~~Optimize Winston logger for Google Cloud Logging~~
- [x] ~~Remove LOGTAIL_SOURCE_TOKEN environment variable~~
- [x] ~~Clean structured logging format for Google Cloud~~

**Result**: Logs now go directly to Google Cloud Logging with optimal format for querying and filtering.

---

## Phase 1: Grafana Cloud Setup (Data Sources)

- [ ] Create Grafana Cloud free account
- [ ] Create Grafana stack (choose region closest to your app)
- [ ] Configure Google Cloud Monitoring data source:
  - [ ] Add Google Cloud Monitoring API credentials
  - [ ] Connect to `api-best-shot-demo` project
  - [ ] Test connection to Cloud Run metrics
- [ ] Configure Google Cloud Logging data source:
  - [ ] Add Google Cloud Logging API credentials  
  - [ ] Connect to `api-best-shot-demo` project
  - [ ] Test log query capabilities

---

## Phase 2: Application Performance Monitoring (Optional Metrics)

*Note: Google Cloud Run already provides CPU, memory, request metrics. This adds custom business metrics.*

- [ ] Install Prometheus client: `npm install prom-client`
- [ ] Create metrics service (`src/services/metrics/index.ts`):
  - [ ] HTTP request duration histogram
  - [ ] Database query duration histogram
  - [ ] Authentication success/failure counters
  - [ ] Custom business metrics (guesses submitted, tournaments created, etc.)
- [ ] Add metrics middleware (`src/middlewares/metrics.ts`)
- [ ] Create metrics endpoint (`/metrics`)
- [ ] Configure Grafana to scrape metrics endpoint (if desired)

---

## Phase 3: Grafana Dashboards

### Dashboard 1: Application Performance
- [ ] Request rate (from Cloud Run metrics)
- [ ] Response time percentiles (from Cloud Run metrics)  
- [ ] Error rate (from Cloud Run metrics)
- [ ] Instance count and CPU/Memory usage (from Cloud Run metrics)

### Dashboard 2: Application Logs
- [ ] Error log panels (from Cloud Logging)
- [ ] Request log panels (from Cloud Logging)
- [ ] Authentication attempts (from Cloud Logging)
- [ ] Database connection status (from Cloud Logging)
- [ ] Log volume over time (from Cloud Logging)

### Dashboard 3: Business Metrics (if Phase 2 completed)
- [ ] Tournament activity
- [ ] User engagement metrics
- [ ] Guess submission patterns
- [ ] Performance trends

---

## Phase 4: Alerting

- [ ] Set up alerting rules:
  - [ ] High error rate (>5% 5xx responses)
  - [ ] High response time (p95 > 1s)
  - [ ] Service unavailable
  - [ ] Database connection failures
  - [ ] Memory/CPU usage spikes
- [ ] Configure notification channels:
  - [ ] Email notifications
  - [ ] Slack integration (if needed)

---

## Benefits of This Approach

✅ **No Infrastructure Changes**: Keeps Google Cloud Logging as primary  
✅ **Cost Effective**: Uses Google's included logging + Grafana free tier  
✅ **Better Visualization**: Grafana dashboards > Google Cloud console  
✅ **Reliable**: Leverages Google's mature logging infrastructure  
✅ **Easy Setup**: Just data source configuration, no code changes  
✅ **Powerful Queries**: Can use LogQL-style queries on Cloud Logging data  

---

## Commands Reference

```bash
# Optional: Add custom metrics
npm install prom-client

# Test logs are flowing to Google Cloud
# (Check Google Cloud Console > Logging)

# Test Grafana connection
# (Test data source connection in Grafana UI)
```

---

## Environment Variables (No Changes Needed)

Current setup already optimized for Google Cloud Operations:
- Logs go to `stdout` → Google Cloud Logging (automatic)
- Metrics available via Cloud Run monitoring (automatic)
- No additional environment variables required

---

## Next Steps

1. **Create Grafana Cloud account** (free tier)
2. **Configure Google Cloud data sources** in Grafana
3. **Import/create dashboards** for your monitoring needs
4. **Set up basic alerting** for critical issues

**Estimated Time**: 2-3 hours for complete setup (much faster than previous plan!)

---

## Why This Is Better Than Original Plan

| Original Plan | Simplified Plan |
|---------------|----------------|
| Replace logging infrastructure | Keep Google Cloud Logging |
| Custom Loki transport | Use native Cloud Logging |
| Complex environment setup | Minimal configuration |
| Potential reliability issues | Leverages Google infrastructure |
| More moving parts | Fewer dependencies |
| Higher maintenance | Lower maintenance |

**Result**: Same visualization capabilities with much simpler, more reliable setup.