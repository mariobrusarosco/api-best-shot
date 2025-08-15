/**
 * Demo script to showcase the new enhanced Sentry logging system
 * 
 * This demonstrates how the new tagging system makes logs easily filterable
 */

import { LambdaLogger, ApiLogger, ServiceLogger, SchedulerLogger } from './logger';

// Demo: Lambda logging
export function demoLambdaLogs() {
  console.log('=== LAMBDA LOGGING DEMO ===');
  
  // These will create structured logs with consistent tags
  LambdaLogger.success('CREATE', 'SCHEDULES', 'demo', {
    schedulesCreated: 9,
    duration: '1234ms'
  });
  
  LambdaLogger.success('UPDATE', 'STANDINGS', 'production', {
    tournamentId: 'euro-2024',
    recordsUpdated: 24
  });
  
  LambdaLogger.error('UPDATE', new Error('API timeout'), 'MATCHES', 'demo', {
    tournamentId: 'copa-america',
    retryAttempt: 3
  });
}

// Demo: API logging  
export function demoApiLogs() {
  console.log('=== API LOGGING DEMO ===');
  
  ApiLogger.success('CREATE', 'TOURNAMENTS', '2', {
    requestId: 'req-123',
    responseTime: '245ms'
  });
  
  ApiLogger.error('UPDATE', new Error('Validation failed'), 'STANDINGS', '2', {
    requestId: 'req-456', 
    validationErrors: ['missing tournamentId']
  });
}

// Demo: Service logging
export function demoServiceLogs() {
  console.log('=== SERVICE LOGGING DEMO ===');
  
  ServiceLogger.success('GENERATE', 'REPORTS', {
    reportType: 'standings-scraping',
    storageType: 'S3',
    s3Key: 'tournament-reports/standings-123.json'
  });
  
  ServiceLogger.error('SCRAPE', new Error('Data not found'), 'TEAMS', {
    tournamentUrl: 'https://example.com/tournament',
    scrapingStep: 'team_extraction'
  });
}

// Demo: Scheduler logging
export function demoSchedulerLogs() {
  console.log('=== SCHEDULER LOGGING DEMO ===');
  
  SchedulerLogger.success('SCHEDULE', 'demo', 'Daily matches scheduled', {
    totalSchedules: 12,
    nextExecution: '2025-08-15T03:00:00Z'
  });
  
  SchedulerLogger.error('INVOKE', new Error('Lambda timeout'), 'production', {
    lambdaFunction: 'caller-scores-and-standings',
    timeout: '30s'
  });
}

// Show filtering examples
export function showFilteringExamples() {
  console.log('\n=== SENTRY FILTERING EXAMPLES ===');
  console.log('With the new tag structure, you can easily filter in Sentry:');
  console.log('');
  console.log('🔍 All Lambda errors: tags.component:LAMBDA AND tags.status:error');
  console.log('🔍 Data Provider APIs: tags.domain:DATA_PROVIDER AND tags.component:API');
  console.log('🔍 Standings operations: tags.resource:STANDINGS');
  console.log('🔍 Production issues: tags.environment:production AND tags.status:error');
  console.log('🔍 CREATE operations: tags.operation:CREATE');
  console.log('🔍 Schedule failures: tags.operation:SCHEDULE AND tags.status:error');
}

// Run demo (only in development)
if (process.env.NODE_ENV === 'development') {
  demoLambdaLogs();
  demoApiLogs();
  demoServiceLogs();
  demoSchedulerLogs();
  showFilteringExamples();
}