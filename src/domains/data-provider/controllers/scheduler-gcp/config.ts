export const GCP_CONFIG = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  region: process.env.GOOGLE_CLOUD_REGION || 'us-central1',
  scoresStandingsFunctionUrl: process.env.GCP_SCORES_STANDINGS_FUNCTION_URL,
  knockoutsUpdateFunctionUrl: process.env.GCP_KNOCKOUTS_UPDATE_FUNCTION_URL,
  serviceAccountKeyPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
};

export const validateGCPConfig = () => {
  const requiredVars = [
    'GOOGLE_CLOUD_PROJECT_ID',
    'GCP_SCORES_STANDINGS_FUNCTION_URL',
    'GCP_KNOCKOUTS_UPDATE_FUNCTION_URL',
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required GCP environment variables: ${missing.join(', ')}`);
  }
};