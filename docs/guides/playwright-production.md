# Playwright Production Guide

## Overview

This guide explains how to effectively use and deploy Playwright-based web scraping in production environments. Our data provider v2 API uses Playwright with Chromium to scrape football data from various sources.

## Local Development

During development, Playwright operates in non-headless mode by default, allowing you to see the browser interactions:

```typescript
this.browser = await chromium.launch({
  headless: isProduction,
  args: isProduction
    ? [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ]
    : [],
});
```

## Production Deployment Requirements

### System Dependencies

Playwright requires specific system dependencies to run Chromium. These are included in our Dockerfile:

- libgbm-dev
- libglib2.0-0
- libnspr4
- libnss3
- libx11-xcb1
- Various font packages

### Railway.com Deployment

Our application is deployed on Railway.com, which provides container-based hosting. Make sure that:

1. Resource allocation is sufficient (at least 1GB RAM recommended)
2. The service has outbound internet access for scraping operations
3. Docker build process includes Playwright browser installation

## Best Practices

### 1. Error Handling & Retries

Always implement robust error handling for scraping operations:

```typescript
try {
  // Scraping logic
} catch (error) {
  // Log error details
  Profiling.error({
    source: 'SCRAPER_OPERATION_NAME',
    error,
  });

  // Implement retry logic if appropriate
  if (retriesAttempted < maxRetries) {
    await delay(retryDelay);
    return this.scrapeWithRetry(url, retriesAttempted + 1);
  }
}
```

### 2. Resource Management

Always close browser instances after use to prevent memory leaks:

```typescript
async close() {
  try {
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
  } catch (error) {
    console.error('Error closing browser:', error);
  }
}
```

### 3. Throttling & Politeness

Respect the websites you're scraping by:

- Adding delays between requests
- Not making too many concurrent requests
- Following robots.txt guidelines when applicable

```typescript
// Example delay between requests
await new Promise(resolve => setTimeout(resolve, 1000));
```

## Common Issues & Solutions

### 1. Memory Usage

**Problem**: High memory usage in production

**Solutions**:

- Use `context.newPage()` instead of launching multiple browser instances
- Close pages after use with `await page.close()`
- Set lower concurrency for scraping operations

### 2. Timeouts

**Problem**: Scraping operations timeout

**Solutions**:

- Increase timeout settings: `page.goto(url, { timeout: 60000 })`
- Implement retry logic
- Monitor network conditions

### 3. Anti-Scraping Measures

**Problem**: Target websites block scraping

**Solutions**:

- Rotate user agents
- Add delays between requests
- Use stealth plugins if necessary

## Monitoring & Troubleshooting

### Logs

All scraping operations should use the Profiling service for consistent logging:

```typescript
Profiling.log({
  msg: 'Scraping operation completed',
  data: { result },
  source: 'DATA_PROVIDER_SCRAPER',
});
```

### Health Checks

Implement health checks specific to the scraping functionality to ensure it's working properly in production.

## Performance Optimization

1. **Caching**: Cache scraping results where appropriate
2. **Selective Scraping**: Only scrape data that has changed
3. **Resource Limits**: Set appropriate viewport size and other browser options

```typescript
// Optimized viewport settings
await context.newPage({
  viewport: { width: 1280, height: 720 },
});
```

## Deployment Checklist

- [ ] All Playwright dependencies included in Dockerfile
- [ ] Headless mode enabled for production
- [ ] Memory allocation is sufficient
- [ ] Error handling and retries implemented
- [ ] Logging and monitoring in place
