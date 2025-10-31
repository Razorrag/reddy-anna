import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      phone?: string;
      username?: string;
      role?: string;
    };
    userId?: string;
    adminId?: string;
    isLoggedIn?: boolean;
  }
}
