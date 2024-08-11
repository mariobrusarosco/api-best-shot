declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DB_CREDENTIALS: string
      API_VERSION: string
      TOKEN_KEY: string
      ACESS_CONTROL_ALLOW_ORIGIN: string
      NODE_ENV: string
      VITE_BEST_SHOT_API: string
    }
  }
}

export {}
