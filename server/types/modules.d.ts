declare module 'xss-clean' {
  function xssClean(options?: any): (req: any, res: any, next: any) => void;
  export = xssClean;
}

declare module 'hpp' {
  function hpp(options?: any): (req: any, res: any, next: any) => void;
  export = hpp;
}
