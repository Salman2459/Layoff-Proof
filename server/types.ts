import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      authProvider: string;
    };
  }
}

declare module 'express' {
  interface Request {
    user?: any;
  }
}