declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DB_CREDENTIALS: string;
      API_VERSION: string;
      API_DOMAIN: string;
      TOKEN_KEY: string;
      ACESS_CONTROL_ALLOW_ORIGIN: string;
      MEMBER_PUBLIC_ID_COOKIE: string;
      NODE_ENV: string;
      JWT_SECRET: string;
      VITE_BEST_SHOT_API: string;
      API_PROVIDER: string;
      DATA_PROVIDER_COOKIE: string;
      AWS_ACCESS_KEY_ID: string;
      AWS_SECRET_ACCESS_KEY: string;
      AWS_BUCKET_NAME: string;
      AWS_CLOUDFRONT_ID: string;
      AWS_CLOUDFRONT_URL: string;
      SENTRY_DSN: string;
    }
  }
}

declare module 'dayjs' {
  interface Dayjs {
    fromNow();
  }
}

export {};
