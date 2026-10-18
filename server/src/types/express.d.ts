declare global {
  namespace Express {
    interface Request {
      /** Set by `requireAuth` after a token is verified. */
      userId?: number;
    }
  }
}

export {};
