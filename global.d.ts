declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DB_CREDENTIALS: string
      API_V1_VERSION: string
      TOKEN_KEY: string
    }
  }
}

export {}
