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
    allow_origin: '*',
    mediaroot: './media'
  },
  trans: {
    ffmpeg: process.env.FFMPEG_PATH || '/usr/bin/ffmpeg',
    tasks: [
      {
        app: process.env.RTMP_APP_NAME || 'live',
        hls: true,
        hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
        hlsKeep: true, // Keep segments for short replay buffer
        dash: false
      }
    ]
  }
};

export const nms = new NodeMediaServer(config);

// Track stream status
let isStreamLive = false;
let currentStreamPath = '';

export const getStreamStatus = () => ({
  isLive: isStreamLive,
  streamPath: currentStreamPath
});

nms.on('preConnect', (id: any, args: any) => {
  const sessionId = typeof id === 'string' ? id : id?.id || 'unknown';
  console.log('[NodeEvent on preConnect]', `id=${sessionId} args=${JSON.stringify(args)}`);
  // You can deny connection based on user's role or other conditions
  // let session = nms.getSession(id);
  // session.reject();
});

nms.on('postConnect', (id: any, args: any) => {
  const sessionId = typeof id === 'string' ? id : id?.id || 'unknown';
  console.log('[NodeEvent on postConnect]', `id=${sessionId} args=${JSON.stringify(args)}`);
});

nms.on('doneConnect', (id: any, args: any) => {
  const sessionId = typeof id === 'string' ? id : id?.id || 'unknown';
  console.log('[NodeEvent on doneConnect]', `id=${sessionId} args=${JSON.stringify(args)}`);
});

nms.on('prePublish', (id: any, StreamPath: any, args: any) => {
  const sessionId = typeof id === 'string' ? id : id?.id || 'unknown';
  const streamPath = StreamPath || 'unknown';
  console.log('[NodeEvent on prePublish]', `id=${sessionId} StreamPath=${streamPath} args=${JSON.stringify(args)}`);
  // You can deny publishing based on stream key or other conditions
  // let session = nms.getSession(id);
  // session.reject();
});

nms.on('postPublish', (id: any, StreamPath: any, args: any) => {
  const sessionId = typeof id === 'string' ? id : id?.id || 'unknown';
  const streamPath = StreamPath || '/live/stream';
  console.log('[NodeEvent on postPublish]', `id=${sessionId} StreamPath=${streamPath} args=${JSON.stringify(args)}`);
  isStreamLive = true;
  currentStreamPath = streamPath;
  console.log('🔴 STREAM STARTED:', streamPath);
});

nms.on('donePublish', (id: any, StreamPath: any, args: any) => {
  const sessionId = typeof id === 'string' ? id : id?.id || 'unknown';
  const streamPath = StreamPath || currentStreamPath;
  console.log('[NodeEvent on donePublish]', `id=${sessionId} StreamPath=${streamPath} args=${JSON.stringify(args)}`);
  isStreamLive = false;
  currentStreamPath = '';
  console.log('⚫ STREAM ENDED:', streamPath);
});

nms.on('prePlay', (id: any, StreamPath: any, args: any) => {
  const sessionId = typeof id === 'string' ? id : id?.id || 'unknown';
  const streamPath = StreamPath || 'unknown';
  console.log('[NodeEvent on prePlay]', `id=${sessionId} StreamPath=${streamPath} args=${JSON.stringify(args)}`);
  // You can deny playing based on user's role or other conditions
  // let session = nms.getSession(id);
  // session.reject();
});

nms.on('postPlay', (id: any, StreamPath: any, args: any) => {
  const sessionId = typeof id === 'string' ? id : id?.id || 'unknown';
  const streamPath = StreamPath || 'unknown';
  console.log('[NodeEvent on postPlay]', `id=${sessionId} StreamPath=${streamPath} args=${JSON.stringify(args)}`);
});

nms.on('donePlay', (id: any, StreamPath: any, args: any) => {
  const sessionId = typeof id === 'string' ? id : id?.id || 'unknown';
  const streamPath = StreamPath || 'unknown';
  console.log('[NodeEvent on donePlay]', `id=${sessionId} StreamPath=${streamPath} args=${JSON.stringify(args)}`);
});
