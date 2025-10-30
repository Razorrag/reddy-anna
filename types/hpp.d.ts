declare module 'hpp' {
  import { RequestHandler } from 'express';

  interface Options {
    whitelist?: string[];
    allowDots?: boolean;
    allowPrototypes?: boolean;
    plainObjects?: boolean;
    serializeDate?: () => string;
    skipFunctions?: boolean;
    decoder?: (str: string, defaultDecoder: (str: string) => string, charset: string, type: 'key' | 'value') => any;
  }

  function hpp(options?: Options): RequestHandler;

  export = hpp;
}