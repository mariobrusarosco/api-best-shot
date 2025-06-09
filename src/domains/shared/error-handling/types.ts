export interface ApiError extends Error {
  message: string;
  status?: number;
  user?: {
    message: string;
    code: string;
  };
}
