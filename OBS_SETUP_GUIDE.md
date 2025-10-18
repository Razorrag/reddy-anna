# OBS Studio Setup Guide for Andar Bahar Streaming

This guide will help you configure OBS Studio to stream to your Andar Bahar game platform.

## Prerequisites

1. Download and install OBS Studio from https://obsproject.com/
2. Ensure your Andar Bahar server is running
3. Have your RTMP server details ready

## Step 1: Configure OBS Studio Settings

### 1.1 Open OBS Settings
1. Launch OBS Studio
2. Go to **File** → **Settings** (or click Settings in the bottom right)

### 1.2 Configure Stream Settings
1. In the Settings window, select **Stream** from the left sidebar
2. Set **Service** to "Custom Streaming Server"
3. Configure the following:
   - **Server**: `rtmp://localhost:1935/live` (replace localhost with your server IP if streaming from another computer)
   - **Stream Key**: `stream` (or your custom stream key)

### 1.3 Configure Video Settings
1. Select **Video** from the left sidebar
2. Set the following recommended settings:
   - **Base (Canvas) Resolution**: 1920x1080
   - **Output (Scaled) Resolution**: 1280x720 or 1920x1080
   - **Downscale Filter**: Lanczos (Sharpened scaling, 36 samples)
   - **Common FPS Values**: 30 or 60

### 1.4 Configure Audio Settings
1. Select **Audio** from the left sidebar
2. Set the following:
   - **Sample Rate**: 48 kHz
   - **Channels**: Stereo

### 1.5 Configure Output Settings
1. Select **Output** from the left sidebar
2. Set **Output Mode** to "Advanced"
3. In the **Streaming** tab:
   - **Video Bitrate**: 2500-6000 Kbps (depending on quality)
   - **Audio Bitrate**: 128-160 Kbps
   - **Keyframe Interval**: 2 seconds

## Step 2: Set Up Your Scene

### 2.1 Create a Scene
1. In the "Scenes" panel, click the "+" button
2. Name your scene "Andar Bahar Live"

### 2.2 Add Sources
1. **Game Capture** (if streaming a game):
   - Click the "+" button in the "Sources" panel
   - Select "Game Capture"
   - Choose your game or display
   - Adjust capture settings as needed

2. **Video Capture Device** (if using webcam):
   - Click the "+" button
   - Select "Video Capture Device"
   - Choose your webcam
   - Position and resize as needed

3. **Image/Text Overlays** (optional):
   - Add text overlays for game information
   - Add images for branding

## Step 3: Configure Stream Settings in Admin Panel

1. Log in to your Andar Bahar admin panel
2. Go to **Settings** → **Live Stream Management**
3. Configure the following:
   - **Stream Type**: Select "RTMP Stream"
   - **RTMP Server URL**: `rtmp://localhost:1935/live`
   - **RTMP Stream Key**: `stream`
   - **Stream Title**: "Andar Bahar Live Game"
   - **Stream Status**: "Live"
4. Click **Save Stream Settings**

## Step 4: Start Streaming

1. In OBS Studio, click **Start Streaming** in the bottom right
2. Check the status indicator - it should turn green
3. Verify your stream appears in the Andar Bahar game interface

## Step 5: Monitor Your Stream

### 5.1 Check Stream Status
- Look for the "LIVE" indicator in your game interface
- Monitor viewer count
- Check for any buffering or quality issues

### 5.2 Troubleshooting Common Issues

**Stream not appearing:**
- Verify RTMP server is running (check console logs)
- Check firewall settings for ports 1935 and 8000
- Ensure OBS settings match server configuration

**Poor quality:**
- Adjust bitrate in OBS output settings
- Check internet connection stability
- Reduce resolution if necessary

**Audio issues:**
- Verify audio device is selected in OBS
- Check audio levels in OBS mixer
- Ensure audio bitrate is set correctly

## Advanced Configuration

### Custom Stream Key
For better security, you can use a custom stream key:
1. Update your stream key in OBS
2. Update the corresponding setting in the admin panel
3. Restart the stream

### Multiple Bitrates
For professional streaming, consider setting up multiple bitrate streams:
- Configure multiple outputs in OBS
- Set up a transcoding server (optional)
- Use adaptive bitrate streaming

## Security Considerations

1. **Change default stream key**: Don't use "stream" in production
2. **Use secure RTMP**: Consider using RTMPS for encrypted streaming
3. **Firewall configuration**: Only open necessary ports
4. **Access control**: Limit who can stream to your server

## Performance Tips

1. **Hardware encoding**: Use GPU encoding if available
2. **Network optimization**: Use wired connection when possible
3. **System resources**: Close unnecessary applications while streaming
4. **Monitor resources**: Keep an eye on CPU and GPU usage

## Support

If you encounter issues:
1. Check OBS Studio logs (Help → Log Files)
2. Review server console output
3. Verify network connectivity
4. Test with different settings

For additional support, refer to the OBS Studio documentation at https://obsproject.com/wiki/