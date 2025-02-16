require('dotenv').config();

const REQUIRED_VARS = {
  DB_USER: 'Database username',
  DB_PASSWORD: 'Database password',
  DB_NAME: 'Database name',
  DB_PORT: 'Database port',
  DB_HOST: 'Database host',
  NODE_ENV: 'Environment',
  SENTRY_DSN: 'Sentry DSN',
  PORT: 'Port',
  ACCESS_CONTROL_ALLOW_ORIGIN: 'Access control allow origin',
  AWS_ACCESS_KEY_ID: 'AWS access key ID',
  AWS_SECRET_ACCESS_KEY: 'AWS secret access key',
  AWS_BUCKET_NAME: 'AWS bucket name',
  JWT_SECRET: 'JWT secret',
  MEMBER_PUBLIC_ID_COOKIE: 'Member public ID cookie',
  API_VERSION: 'API version',
};

console.log('\n🔍 Validating environment variables...\n');

const missingVars = [];

Object.entries(REQUIRED_VARS).forEach(([key, description]) => {
  if (!process.env[key]) {
    missingVars.push(`${key} (${description})`);
  }
});

if (missingVars.length > 0) {
  console.error('\x1b[31m❌ Missing required environment variables:\x1b[0m');
  missingVars.forEach(variable => {
    console.error(`\x1b[31m   - ${variable}\x1b[0m`);
  });
  console.error('\n\x1b[33m📝 Please ensure these variables are set in your .env file');
  console.error('💡 Tip: Run \'docker compose --profile setup up env-setup\' to generate a default .env file\x1b[0m\n');
  process.exit(1);
}

console.log('\x1b[32m✅ All required environment variables are set!\x1b[0m\n'); 