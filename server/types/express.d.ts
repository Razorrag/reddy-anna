// Express type declarations for our custom request interface
import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'user' | 'admin' | 'superadmin';
      };
    }
  }
}

export {};
