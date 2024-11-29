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
    }
  }
}

export {};
