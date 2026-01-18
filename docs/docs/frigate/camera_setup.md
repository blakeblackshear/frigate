---
id: camera_setup
title: Camera setup
---

Cameras configured to output H.264 video and AAC audio will offer the most compatibility with all features of Frigate and Home Assistant. H.265 has better compression, but less compatibility. Firefox 134+/136+/137+ (Windows/Mac/Linux & Android), Chrome 108+, Safari and Edge are the only browsers able to play H.265 and only support a limited number of H.265 profiles. Ideally, cameras should be configured directly for the desired resolutions and frame rates you want to use in Frigate. Reducing frame rates within Frigate will waste CPU resources decoding extra frames that are discarded. There are three different goals that you want to tune your stream configurations around.

- **Detection**: This is the only stream that Frigate will decode for processing. Also, this is the stream where snapshots will be generated from. The resolution for detection should be tuned for the size of the objects you want to detect. See [Choosing a detect resolution](#choosing-a-detect-resolution) for more details. The recommended frame rate is 5fps, but may need to be higher (10fps is the recommended maximum for most users) for very fast moving objects. Higher resolutions and frame rates will drive higher CPU usage on your server.

- **Recording**: This stream should be the resolution you wish to store for reference. Typically, this will be the highest resolution your camera supports. I recommend setting this feed in your camera's firmware to 15 fps.

- **Stream Viewing**: This stream will be rebroadcast as is to Home Assistant for viewing with the stream component. Setting this resolution too high will use significant bandwidth when viewing streams in Home Assistant, and they may not load reliably over slower connections.

:::tip

For the best experience in Frigate's UI, configure your camera so that the detection and recording streams use the same aspect ratio. For example, if your main stream is 3840x2160 (16:9), set your substream to 640x360 (also 16:9) instead of 640x480 (4:3). While not strictly required, matching aspect ratios helps ensure seamless live stream display and preview/recordings playback.

:::

### Choosing a detect resolution

The ideal resolution for detection is one where the objects you want to detect fit inside the dimensions of the model used by Frigate (320x320). Frigate does not pass the entire camera frame to object detection. It will crop an area of motion from the full frame and look in that portion of the frame. If the area being inspected is larger than 320x320, Frigate must resize it before running object detection. Higher resolutions do not improve the detection accuracy because the additional detail is lost in the resize. Below you can see a reference for how large a 320x320 area is against common resolutions.

Larger resolutions **do** improve performance if the objects are very small in the frame.

![Resolutions](/img/resolutions-min.jpg)

### Example Camera Configuration

For the Dahua/Loryta 5442 camera, I use the following settings:

**Main Stream (Recording & RTSP)**

- Encode Mode: H.264
- Resolution: 2688\*1520
- Frame Rate(FPS): 15
- I Frame Interval: 30 (15 can also be used to prioritize streaming performance - see the [camera settings recommendations](/configuration/live#camera_settings_recommendations) for more info)

**Sub Stream (Detection)**

- Enable: Sub Stream 2
- Encode Mode: H.264
- Resolution: 1280\*720
- Frame Rate: 5
- I Frame Interval: 5
