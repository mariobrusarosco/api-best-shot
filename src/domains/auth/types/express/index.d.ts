declare namespace Express {
  export interface Request {
    authenticatedUser: {
      id: string;
      nickName: string;
      role: string;
    };
  }
}
