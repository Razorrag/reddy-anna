/**
 * RTMP Player Component
 * 
 * Plays RTMP streams via HLS.js or iframe player
 * Used for OBS/Streamlabs streaming
 */

import { useEffect, useRef } from 'react';

interface RTMPPlayerProps {
  playerUrl: string;
  streamTitle?: string;
}

export default function RTMPPlayer({ playerUrl, streamTitle }: RTMPPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Log when player loads
    console.log('🎬 RTMP Player initialized:', playerUrl);
  }, [playerUrl]);

  // If it's a Restream URL, use iframe
  if (playerUrl.includes('restream.io') || playerUrl.includes('player.')) {
    return (
      <iframe
        ref={iframeRef}
        src={playerUrl}
        className="absolute inset-0 w-full h-full"
        frameBorder="0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        title={streamTitle || 'Live Stream'}
      />
    );
  }

  // For HLS streams, could use hls.js here
  // For now, using video element with native HLS support (Safari) or fallback
  return (
    <video
      className="absolute inset-0 w-full h-full object-contain bg-black"
      controls
      autoPlay
      muted
      playsInline
      src={playerUrl}
    >
      <source src={playerUrl} type="application/x-mpegURL" />
      Your browser does not support HLS video playback.
    </video>
  );
}
