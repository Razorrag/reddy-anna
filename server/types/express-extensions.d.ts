import { Request } from 'express';

// Extend Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        phone?: string;
        username?: string;
        role: string;
      };
    }
  }
}

export {};