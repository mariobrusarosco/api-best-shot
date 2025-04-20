/**
 * Auth domain profiling constants
 * 
 * These constants are used to standardize profiling messages across the auth domain.
 * Using these enum values instead of string literals makes logs more discoverable and
 * consistent in monitoring tools like Sentry.
 */

export enum PROFILLING_AUTH {
  // Authentication related errors
  AUTHENTICATE_USER = '[AUTH] Failed to authenticate user',
  AUTHENTICATION_VALIDATION_ERROR = '[AUTH] Request validation error during authentication',
  
  // Token related errors
  CREATE_TOKEN = '[AUTH] Failed to create token',
  VALIDATE_TOKEN = '[AUTH] Failed to validate token', 
  REFRESH_TOKEN = '[AUTH] Failed to refresh token',
  EXPIRED_TOKEN = '[AUTH] Token expired',
  INVALID_TOKEN = '[AUTH] Invalid token format',
  
  // User session related errors
  UNAUTHENTICATE_USER = '[AUTH] Failed to log out user',
  SESSION_EXPIRED = '[AUTH] User session expired',
  
  // Middleware related errors
  AUTH_MIDDLEWARE_ERROR = '[AUTH] Error in auth middleware',
  PERMISSION_DENIED = '[AUTH] Permission denied',
  
  // Events (for log method)
  USER_AUTHENTICATED = '[AUTH] User successfully authenticated',
  USER_LOGGED_OUT = '[AUTH] User successfully logged out',
  TOKEN_REFRESHED = '[AUTH] User token refreshed',
  
  // Other auth operations
  PASSWORD_RESET_REQUESTED = '[AUTH] Password reset requested',
  PASSWORD_RESET_COMPLETED = '[AUTH] Password reset completed',
  ACCOUNT_LOCKED = '[AUTH] User account locked due to failed attempts'
} 