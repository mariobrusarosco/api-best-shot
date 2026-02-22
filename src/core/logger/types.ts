/**
 * Type definitions for the Unified Logger Service
 */
import { Domain } from './constants';

/**
 * Standard tag structure for Sentry logging.
 * These are indexed fields and should be low-cardinality values.
 *
 * Strategy:
 * - domain: Required, strict enum (DOMAINS)
 * - operation: Required, flexible string
 * - component: Optional, flexible string
 */
export interface LogTags {
  domain: Domain;
  operation: string;
  component?: string;
  [key: string]: string | undefined;
}

/**
 * Standard extra data structure for Sentry logging.
 * This is for non-indexed, high-cardinality data.
 */
export interface LogExtra {
  timestamp?: string;
  duration?: string;
  requestId?: string;
  userId?: string;
  tournamentId?: string;
  [key: string]: unknown;
}
