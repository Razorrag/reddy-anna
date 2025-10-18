declare module 'node-media-server' {
  class NodeMediaServer {
    constructor(config: any);
    run(): void;
    on(event: string, callback: (...args: any[]) => void): void;
    getSession(id: string): any;
  }
  
  export = NodeMediaServer;
}