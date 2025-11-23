# Loop Video Fix - Manual Patch

## Problem
The loop video doesn't show when there's no stream configured.

## Solution
Replace the "Stream not configured" message (lines 700-712 in VideoArea.tsx) with the loop video player.

## File to Edit
`client/src/components/MobileGameLayout/VideoArea.tsx`

## Find This Code (around line 700):
```tsx
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
          <div className="text-center px-6">
            <div className="text-6xl mb-4">🎥</div>
            <p className="text-gray-400 text-lg">Stream not configured</p>
            <p className="text-gray-600 text-sm mt-2">
              {!streamConfig && 'No config loaded'}
              {streamConfig && !streamConfig.isActive && 'Stream is not active - Toggle ON in admin settings'}
              {streamConfig && streamConfig.isActive && !streamConfig.streamUrl && 'Stream URL is empty'}
            </p>
          </div>
        </div>
      );
```

## Replace With:
```tsx
      return (
        <div className="relative w-full h-full">
          <video
            ref={videoRef}
            src="/uhd_30fps.mp4"
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            style={{ position: 'absolute', inset: 0, zIndex: 1 }}
            onError={(e) => console.error('❌ Loop video error:', e)}
          />
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="text-center space-y-4 px-6">
              <h1 
                className="text-5xl md:text-6xl font-bold text-white"
                style={{ textShadow: '0 0 20px rgba(0, 0, 0, 0.9), 0 0 40px rgba(0, 0, 0, 0.7), 0 4px 8px rgba(0, 0, 0, 0.8)' }}
              >
                Next Game At
              </h1>
              {streamConfig?.loopNextGameDate && (
                <p 
                  className="text-3xl md:text-4xl font-bold text-gold"
                  style={{ textShadow: '0 0 15px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 0, 0, 0.7), 0 3px 6px rgba(0, 0, 0, 0.8)' }}
                >
                  {streamConfig.loopNextGameDate}
                </p>
              )}
              {streamConfig?.loopNextGameTime && (
                <p 
                  className="text-6xl md:text-7xl font-bold text-gold"
                  style={{ textShadow: '0 0 20px rgba(0, 0, 0, 0.9), 0 0 40px rgba(0, 0, 0, 0.7), 0 4px 8px rgba(0, 0, 0, 0.8)' }}
                >
                  {streamConfig.loopNextGameTime}
                </p>
              )}
              {(!streamConfig?.loopNextGameDate && !streamConfig?.loopNextGameTime) && (
                <p 
                  className="text-3xl md:text-4xl font-bold text-white"
                  style={{ textShadow: '0 0 15px rgba(0, 0, 0, 0.9), 0 0 30px rgba(0, 0, 0, 0.7), 0 3px 6px rgba(0, 0, 0, 0.8)' }}
                >
                  Game will resume shortly
                </p>
              )}
            </div>
          </div>
        </div>
      );
```

## Also Update the Console Log (line 694):
Change:
```tsx
      console.log('❌ VideoArea: Stream NOT showing because:', {
```

To:
```tsx
      console.log('🔁 VideoArea: No stream - showing loop video', {
```

## Result
- When there's no stream configured, the loop video (`/uhd_30fps.mp4`) will play automatically
- Clean text overlay shows "Next Game At" with date/time from admin settings
- No background boxes - just text with shadows over the video
- Fallback message "Game will resume shortly" if no date/time is set

## Testing
1. Make sure stream is NOT active in admin settings (or no stream URL)
2. Go to the game page
3. You should see the loop video playing with the "Next Game At" message
4. To set date/time: Go to admin stream settings → Set "Next Game Date" and "Next Game Time" → Save
