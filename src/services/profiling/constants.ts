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
} as const;

// Component Types
export const COMPONENTS = {
  LAMBDA: 'LAMBDA',
  API: 'API',
  SERVICE: 'SERVICE',
  CONTROLLER: 'CONTROLLER',
  SCHEDULER: 'SCHEDULER',
  SCRAPER: 'SCRAPER',
  DATABASE: 'DATABASE',
  MIDDLEWARE: 'MIDDLEWARE',
} as const;

// Operation Types
export const OPERATIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  READ: 'READ',
  SCRAPE: 'SCRAPE',
  SCHEDULE: 'SCHEDULE',
  AUTHENTICATE: 'AUTHENTICATE',
  VALIDATE: 'VALIDATE',
  TRANSFORM: 'TRANSFORM',
  GENERATE: 'GENERATE',
  UPLOAD: 'UPLOAD',
  FETCH: 'FETCH',
  PROCESS: 'PROCESS',
  INVOKE: 'INVOKE',
} as const;

// Resource Types
export const RESOURCES = {
  STANDINGS: 'STANDINGS',
  MATCHES: 'MATCHES',
  TEAMS: 'TEAMS',
  ROUNDS: 'ROUNDS',
  TOURNAMENTS: 'TOURNAMENTS',
  SCHEDULES: 'SCHEDULES',
  USERS: 'USERS',
  GUESSES: 'GUESSES',
  LEAGUES: 'LEAGUES',
  SCORES: 'SCORES',
  REPORTS: 'REPORTS',
  FILES: 'FILES',
} as const;

// Status Types
export const STATUSES = {
  SUCCESS: 'success',
  ERROR: 'error',
  STARTED: 'started',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
} as const;

// Environment Types
export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  DEMO: 'demo',
  PRODUCTION: 'production',
} as const;

// Message Prefixes
export const MESSAGE_PREFIXES = {
  [COMPONENTS.LAMBDA]: '🔄 LAMBDA',
  [COMPONENTS.API]: '🌐 API',
  [COMPONENTS.SERVICE]: '⚙️ SERVICE',
  [COMPONENTS.CONTROLLER]: '🎮 CONTROLLER',
  [COMPONENTS.SCHEDULER]: '⏰ SCHEDULER',
  [COMPONENTS.SCRAPER]: '🕷️ SCRAPER',
  [COMPONENTS.DATABASE]: '🗄️ DATABASE',
  [COMPONENTS.MIDDLEWARE]: '🔗 MIDDLEWARE',
} as const;

// Type exports for TypeScript
export type Domain = (typeof DOMAINS)[keyof typeof DOMAINS];
export type Component = (typeof COMPONENTS)[keyof typeof COMPONENTS];
export type Operation = (typeof OPERATIONS)[keyof typeof OPERATIONS];
export type Resource = (typeof RESOURCES)[keyof typeof RESOURCES];
export type Status = (typeof STATUSES)[keyof typeof STATUSES];
export type Environment = (typeof ENVIRONMENTS)[keyof typeof ENVIRONMENTS];
