/// <reference path="./types/node-media-server.d.ts" />
import NodeMediaServer from 'node-media-server';

const config = {
  rtmp: {
    port: parseInt(process.env.RTMP_SERVER_PORT || '1935'),
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: parseInt(process.env.RTMP_HTTP_PORT || '8000'),
    allow_origin: '*'
  },
  relay: {
    ffmpeg: '/usr/local/bin/ffmpeg',
    tasks: [
      {
        app: process.env.RTMP_APP_NAME || 'live',
        mode: 'push',
        edge: `ws://localhost:${process.env.RTMP_HTTP_PORT || '8001'}/live`
      }
    ]
  }
};

export const nms = new NodeMediaServer(config);

nms.on('preConnect', (id: string, args: any) => {
  console.log('[NodeEvent on preConnect]', `id=${id} args=${JSON.stringify(args)}`);
  // You can deny connection based on user's role or other conditions
  // let session = nms.getSession(id);
  // session.reject();
});

nms.on('postConnect', (id: string, args: any) => {
  console.log('[NodeEvent on postConnect]', `id=${id} args=${JSON.stringify(args)}`);
});

nms.on('doneConnect', (id: string, args: any) => {
  console.log('[NodeEvent on doneConnect]', `id=${id} args=${JSON.stringify(args)}`);
});

nms.on('prePublish', (id: string, StreamPath: string, args: any) => {
  console.log('[NodeEvent on prePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
  // You can deny publishing based on stream key or other conditions
  // let session = nms.getSession(id);
  // session.reject();
});

nms.on('postPublish', (id: string, StreamPath: string, args: any) => {
  console.log('[NodeEvent on postPublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});

nms.on('donePublish', (id: string, StreamPath: string, args: any) => {
  console.log('[NodeEvent on donePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});

nms.on('prePlay', (id: string, StreamPath: string, args: any) => {
  console.log('[NodeEvent on prePlay]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
  // You can deny playing based on user's role or other conditions
  // let session = nms.getSession(id);
  // session.reject();
});

nms.on('postPlay', (id: string, StreamPath: string, args: any) => {
  console.log('[NodeEvent on postPlay]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});

nms.on('donePlay', (id: string, StreamPath: string, args: any) => {
  console.log('[NodeEvent on donePlay]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});