import { auth } from 'express-oauth2-jwt-bearer';

const getRequiredEnvVar = (name: 'AUTH0_ISSUER_BASE_URL' | 'AUTH0_AUDIENCE'): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const Auth0AccessTokenMiddleware = auth({
  issuerBaseURL: getRequiredEnvVar('AUTH0_ISSUER_BASE_URL'),
  audience: getRequiredEnvVar('AUTH0_AUDIENCE'),
});
