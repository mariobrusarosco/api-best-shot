declare global {
  namespace Express {
    interface Request {
      authenticatedUser: {
        id: string;
        nickName: string;
        role: string;
      };
    }
  }
}
