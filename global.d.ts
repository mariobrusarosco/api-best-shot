declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DB_CREDENTIALS: string;
      API_VERSION: string;
      TOKEN_KEY: string;
      ACESS_CONTROL_ALLOW_ORIGIN: string;
      MEMBER_PUBLIC_ID_COOKIE: string;
      NODE_ENV: string;
      JWT_SECRET: string;
      VITE_BEST_SHOT_API: string;
      API_PROVIDER: string;
      AWS_ACCESS_KEY_ID: string;
      AWS_SECRET_ACCESS_KEY: string;
      AWS_BUCKET_NAME: string;
      AWS_CLOUDFRONT_ID: string;
      AWS_CLOUDFRONT_URL: string;
    }
  }
}

export {};
