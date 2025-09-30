---
id: config-gui
title: Using the GUI Configuration Editor
---

# GUI Configuration Editor

Frigate now includes a comprehensive GUI-based configuration editor that makes it easy to configure your NVR system without manually editing YAML files.

## Accessing the GUI Editor

Navigate to **Settings** → **Config** in the Frigate web interface. You'll see a toggle to switch between **YAML Mode** and **GUI Mode**.

## Features

### Comprehensive Coverage
The GUI editor provides form-based editing for **every single configuration option** in Frigate, including:

- Camera setup (streams, detection, recording, snapshots, zones)
- Object detection (detectors, model configuration, tracked objects)
- MQTT integration
- Motion detection
- Recording retention policies
- Snapshots configuration
- Audio detection
- Face recognition
- License plate recognition (LPR)
- Semantic search
- Birdseye view
- PTZ/ONVIF autotracking
- Generative AI integration
- Review system
- Authentication & authorization
- And much more...

### Smart Hints & Validation
- **Tooltips** on every field explain what the setting does
- **Examples** show proper formatting (e.g., RTSP URLs)
- **Inline validation** catches errors before saving
- **Default values** are pre-filled for optional settings
- **Required fields** are clearly marked

### Organized Sections
Configuration is organized into logical tabs:
- **Cameras** - Per-camera configuration
- **Detectors** - Hardware acceleration
- **Objects** - What to detect and track
- **Recording** - Retention and storage
- **Snapshots** - Image capture settings
- **Motion** - Motion detection tuning
- **MQTT** - Integration settings
- **Audio** - Audio detection
- **Advanced** - System-level settings

### No More YAML Syntax Errors
- No need to worry about indentation
- No missing colons or brackets
- Auto-completion for enum values
- Type-safe inputs (numbers, booleans, arrays)

## Quick Start Guide

### Adding Your First Camera

1. Navigate to the **Cameras** tab
2. Click **Add Camera**
3. Enter a name (e.g., "front_door")
4. Add your RTSP stream URL:
   ```
   rtsp://username:password@192.168.1.100:554/stream
   ```
5. Set detection resolution (usually 1280x720)
6. Enable the camera
7. **Disable detection** initially until you confirm the feed works
8. Click **Save Only**
9. Check the Live view to ensure the stream works
10. Return and **enable detection**

### Configuring MQTT for Home Assistant

1. Go to the **MQTT** tab
2. Toggle **Enable MQTT** on
3. For HA Add-on users, enter:
   - Host: `core-mosquitto`
   - Port: `1883`
   - Username: Your MQTT username
   - Password: Your MQTT password
4. For Docker users, enter your broker's IP/hostname
5. Click **Save & Restart**

### Setting Up Object Detection

1. Navigate to **Detectors** tab
2. Select your detector type:
   - **Edge TPU** for Google Coral
   - **OpenVINO** for Intel graphics
   - **TensorRT** for NVIDIA GPUs
   - **CPU** if no hardware available
3. Go to **Objects** tab
4. Select which objects to track (person, car, dog, etc.)
5. Configure filters (min/max size, confidence thresholds)

### Configuring Recording

1. Open the **Recording** tab
2. Toggle **Enable Recording** on
3. Set retention:
   - **Continuous**: How long to keep all footage (e.g., 3 days)
   - **Events**: How long to keep footage with detections (e.g., 30 days)
4. Choose retention mode:
   - `all` - Keep everything
   - `motion` - Only keep when motion detected
   - `active_objects` - Only keep when objects detected
5. Monitor storage usage in **System** → **Storage**

## Tips & Best Practices

### Start Simple
- Add ONE camera first
- Test the stream before enabling detection
- Add more features incrementally

### Use Environment Variables for Secrets
Instead of hardcoding passwords, use environment variables:
```
{FRIGATE_MQTT_PASSWORD}
{FRIGATE_RTSP_PASSWORD}
```

### Check the Docs
Each section includes a **"View Documentation"** link that opens the relevant guide.

### Still Need YAML?
You can switch to YAML mode at any time to:
- See the generated configuration
- Make bulk changes
- Copy/paste complex settings
- Use advanced features not yet in GUI

The YAML and GUI modes stay in sync - changes in one are reflected in the other.

## Troubleshooting

### "Config validation error"
- Check required fields are filled (marked with *)
- Verify RTSP URLs are correct
- Ensure camera names don't conflict with zone names

### Changes not applying
- Click **Save & Restart** not just **Save Only**
- Wait for Frigate to fully restart (check System page)

### Camera not showing
- Verify stream URL is correct
- Check camera is **enabled** in GUI
- Look at logs for connection errors

### Storage filling up
- Reduce recording retention days
- Use `motion` mode instead of `all`
- Decrease detection resolution/FPS

## Switching Back to YAML

If you prefer YAML editing:
1. Click **Switch to YAML Editor** button
2. Make your changes
3. Save

Your GUI changes are preserved in the YAML and vice versa.

## Getting Help

- **Documentation**: https://docs.frigate.video
- **GitHub Issues**: https://github.com/blakeblackshear/frigate/issues
- **Discussions**: https://github.com/blakeblackshear/frigate/discussions

The GUI editor is designed to make Frigate accessible to everyone, from beginners to advanced users. No more YAML nightmares!