/**
 * Standardized Sentry logging constants for consistent tagging and messaging
 */

// Domain Types
export const DOMAINS = {
  DATA_PROVIDER: 'DATA_PROVIDER',
  TOURNAMENT: 'TOURNAMENT',
  AUTH: 'AUTH',
  GUESS: 'GUESS',
  MATCH: 'MATCH',
  LEAGUE: 'LEAGUE',
  MEMBER: 'MEMBER',
  ADMIN: 'ADMIN',
  DASHBOARD: 'DASHBOARD',
  PERFORMANCE: 'PERFORMANCE',
  SCORE: 'SCORE',
  TEAM: 'TEAM',
  AI: 'AI',
} as const;

// Environment Types
export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  DEMO: 'demo',
  PRODUCTION: 'production',
} as const;

// Type exports for TypeScript
export type Domain = (typeof DOMAINS)[keyof typeof DOMAINS];
export type Environment = (typeof ENVIRONMENTS)[keyof typeof ENVIRONMENTS];
