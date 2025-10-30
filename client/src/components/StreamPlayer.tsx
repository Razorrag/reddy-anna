/**
 * StreamPlayer - Unified Player Wrapper
 *
 * This component decides which video player to render based on the
 * current application state.
 *
 * It prioritizes WebRTC screen sharing over the default RTMP stream.
 */
import React from 'react';
import RTMPPlayer from './StreamPlayer/RTMPPlayer';
import WebRTCPlayer from './StreamPlayer/WebRTCPlayer';

interface StreamPlayerProps {
  isLive: boolean;
  isScreenSharing: boolean; // The prop from VideoArea
  className?: string;
}

const StreamPlayer: React.FC<StreamPlayerProps> = ({
  isLive,
  isScreenSharing,
  className,
}) => {

  // 1. Priority: If Admin is screen sharing, show the WebRTC player.
  if (isScreenSharing) {
    return <WebRTCPlayer className={className} />;
  }

  // 2. Fallback: If game is live (but not screen sharing), show RTMP player.
  //    (This assumes RTMP is your default stream)
  if (isLive) {
    // You might need to pass RTMP stream keys here
    return <RTMPPlayer className={className} />;
  }

  // 3. Default: If nothing is live, show an offline message.
  return (
    <div className={`bg-gray-900 flex items-center justify-center text-white ${className}`}>
      Stream Offline
    </div>
  );
};

export default StreamPlayer;
