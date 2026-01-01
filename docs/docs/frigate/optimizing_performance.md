---
id: optimizing_performance
title: Optimizing Performance
---

# Optimizing Performance

Optimizing Frigate's performance is key to ensuring a responsive system and minimizing resource usage. This guide covers the most impactful configuration changes you can make to improve efficiency.

## 1. Hardware Acceleration for Video Decoding

**Priority: Critical**

Video decompression is one of the most CPU-intensive tasks in Frigate. While an AI accelerator handles object detection, it does not assist with decoding video streams, as described in the [getting started guide](../guides/getting_started). Hardware acceleration (hwaccel) offloads this work to your GPU or specialized video decode hardware, significantly reducing CPU usage and enabling you to support more cameras on the same hardware.

### Key Concepts

**Resolution & FPS Impact:** The decoding burden grows exponentially with resolution and frame rate. A 4K stream at 30 FPS requires roughly 4 times the processing power of a 1080p stream at the same frame rate, and doubling the frame rate doubles the decode workload. This is why hardware acceleration becomes critical when working with multiple high-resolution cameras.

**Hardware Acceleration Benefits:** By using dedicated video decode hardware (Intel QuickSync, NVIDIA NVDEC, AMD VCE, or VA-API), you can:

- Reduce CPU usage by 50-80% per camera stream
- Support 2-3x more cameras on the same hardware
- Free up CPU resources for motion detection and other Frigate processes
- Reduce system heat and power consumption

### Configuration

Frigate provides preset configurations for common hardware acceleration scenarios. Set up `hwaccel_args` based on your hardware in your [configuration](../configuration/reference) as described in the [getting started guide](../guides/getting_started).

### Troubleshooting Hardware Acceleration

If hardware acceleration isn't working:

1. Check Frigate logs for FFmpeg errors related to hwaccel
2. Verify the hardware device is accessible inside the container
3. Ensure your camera streams use H.264 or H.265 codecs (most common)
4. Try different presets if the automatic detection fails
5. Check that your GPU drivers are properly installed on the host system

## 2. Detector Selection and Configuration

**Priority: Critical**

Choosing the right detector for your hardware is the single most important factor for detection performance. The detector is responsible for running the AI model that identifies objects in video frames. Different detector types have vastly different performance characteristics and hardware requirements, as detailed in the [detector documentation](../configuration/object_detectors).

### Understanding Detector Performance

Frigate uses motion detection as a first-line check before running expensive object detection, as explained in the [motion detection documentation](../configuration/motion_detection). When motion is detected, Frigate creates a "region" (the green boxes in the debug viewer) and sends it to the detector. The detector's inference speed determines how many detections per second your system can handle.

**Calculating Detector Capacity:** Your detector has a finite capacity measured in detections per second. With an inference speed of 10ms, your detector can handle approximately 100 detections per second (1000ms / 10ms = 100).If your cameras collectively require more than this capacity, you'll experience delays, missed detections, or the system will fall behind.

### Choosing the Right Detector

Different detectors have vastly different performance characteristics, as shown in the [detector documentation](../configuration/object_detectors):

**OpenVINO on Intel:**

- Inference speed: 10-35ms depending on iGPU/GPU
- Best for: Systems with Intel CPUs (6th gen+) or Arc GPUs
- Requires: Intel CPU with integrated graphics or discrete Intel GPU

**Hailo-8/8L:**

- Inference speed: 7-11ms for yolov6n
- Best for: Newer installations seeking alternatives to Coral
- Requires: M.2 Hailo device

**NVIDIA TensorRT:**

- Inference speed: 8-17ms depending on GPU and model
- Best for: Systems with NVIDIA GPUs, especially for many cameras
- Requires: NVIDIA GPU with CUDA support

**AMD ROCm:**

- Inference speed: 14-50ms depending on model size
- Best for: Systems with AMD discrete GPUs
- Requires: Supported AMD GPU, use -rocm Frigate image

**CPU Detector (Not Recommended):**

- Inference speed: 50-300ms depending on CPU
- Best for: Testing only, not production use
- Note: Even low-end dedicated detectors vastly outperform CPU detection

### Multiple Detector Instances

When a single detector cannot keep up with your camera count, some detector types (`openvino`, `onnx`) allow you to define multiple detector instances to share the workload. This is particularly useful with GPU-based detectors that have sufficient VRAM to run multiple inference processes:

```yaml
detectors:
  ov_0:
    type: openvino
    device: GPU
  ov_1:
    type: openvino
    device: GPU
```

**When to add a second detector:**

- Your detection_fps consistently falls below your configured detect fps
- The detector process shows 100% utilization in System Metrics
- You're experiencing delays in object detection appearing in the UI
- You see "detection appears to be stuck" warnings in logs

### Model Selection and Optimization

The model you use significantly impacts detector performance. Frigate provides default models optimized for each detector type, but you can customize them as described in the [detector documentation](../configuration/object_detectors).

**Model Size Trade-offs:**

- Smaller models (320x320): Faster inference, Frigate is specifically optimized for a 320x320 size model.
- Larger models (640x640): Slower inference, can often times have better accuracy depending on the camera frame and objects you are trying to detect, but also prevents Frigate from zooming in as much on the frame.

## 3. Camera Stream Configuration

**Priority: High**

Properly configuring your camera streams is essential for optimal performance. Frigate supports multiple input streams per camera, allowing you to use different resolutions and frame rates for different purposes, as explained in the [camera documentation](../configuration/cameras).

### Detect Stream Resolution

Your `detect` stream resolution should be just high enough to reliably identify the objects you care about, but no higher. Higher resolutions dramatically increase both CPU (decoding) and detector (inference) workload, as noted in the [getting started guide](../guides/getting_started) and [camera documentation](../configuration/cameras).

**Resolution Guidelines:**

- **1280x720 (720p):** Recommended starting point for most installations in the [getting started guide](../guides/getting_started).
- **640x480 (VGA):** Suitable for close-range detection (doorways, small rooms)
- **1920x1080 (1080p):** Only if detecting small objects at distance
- **Avoid 4K for detection:** Rarely necessary and extremely resource-intensive

**Important:** Frigate will try to automatically detect the stream resolution if not specified, but it is recommended to explicitly set it in the [getting started guide](../guides/getting_started) to ensure consistency and help with troubleshooting.

### Frame Rate Optimization

A higher frame rate for detection increases CPU and detector load without always improving accuracy. Most motion happens over multiple frames, so 5 FPS is typically sufficient for reliable object detection, as described in the [configuration reference](../configuration/reference) and [motion detection documentation](../configuration/motion_detection).

**Recommended Configuration:**

```yaml
detect:
  fps: 5
```

**Frame Rate Guidelines:**

- **5 FPS:** Ideal for most use cases, recommended default in the [getting started guide](../guides/getting_started).
- **3-4 FPS:** Acceptable for stationary camera monitoring slow-moving objects
- **10 FPS:** Rarely beneficial, significantly increases resource usage. Only recommended for users with dedicated LPR cameras where the plate crosses the full frame very quickly.
- **Over 10 FPS**: Significantly increases resource usage for no benefit.
- **Reduce at camera level:** If possible, configure your camera to output 5 FPS directly in firmware to save bandwidth and decoding cycles

**Why 5 FPS works:** Frigate uses motion detection to decide when to run object detection. At 5 FPS, there's only 200ms between frames, which is fast enough to catch any significant motion while using 1/6th the resources of 30 FPS, as explained in the [motion detection documentation](../configuration/motion_detection).

### Separate Streams for Detect vs. Record

One of the most impactful optimizations is using separate streams for detection and recording. This allows you to use a low-resolution sub-stream for efficient detection while recording high-quality footage from the main stream, as recommended in the [getting started guide](../guides/getting_started) and [camera documentation](../configuration/cameras).

**Benefits of separate streams:**

- Detect stream can be 720p @ 5 FPS for efficiency
- Record stream can be 4K @ 15-30 FPS for quality
- Reduces detector workload by 75% or more
- Maintains high-quality recordings for evidence
- Allows independent optimization of each stream

**Single Stream Configuration:** If you must use a single stream, Frigate will automatically assign the `detect` role, as described in the [camera documentation](../configuration/cameras).

However, this is less efficient as the same high-resolution stream must be decoded for both purposes.

## 4. Motion Detection Tuning

**Priority: High**

Motion detection acts as the critical first-line gatekeeper for object detection in Frigate. It determines when and where to run expensive AI inference, as explained in the [motion detection documentation](../configuration/motion_detection). Properly tuned motion detection ensures your detector only analyzes relevant areas, dramatically improving system efficiency.

### Understanding Motion Detection's Role

Frigate uses motion detection to identify areas of the frame worth checking with object detection:

1. **Motion Detection:** Analyzes pixel changes between frames to detect movement
2. **Motion Boxes:** Groups nearby motion into rectangles (red boxes in debug view)
3. **Region Creation:** Creates square regions around motion areas (green boxes)
4. **Object Detection:** Runs AI inference only on these regions

**Why this matters:** Without motion detection, Frigate would need to run object detection on every frame of every camera continuously, which would be computationally impossible for most systems. Motion detection reduces detector workload by 90-95% in typical scenarios.

### Motion Masks

Motion masks prevent specific areas from triggering object detection. This is one of the most impactful optimizations you can make, as described in the [mask documentation](../configuration/masks) and [motion detection documentation](../configuration/motion_detection).

**What to mask:**

- Camera timestamps and on-screen displays
- Trees, bushes, and vegetation that move in wind
- Flags, banners, or other constantly moving objects
- Sky and clouds
- Rooftops and distant background areas
- Reflective surfaces with changing light

**What NOT to mask:**

- Areas where you want to detect objects, even if you don't want alerts there
- Paths objects might take to reach areas of interest
- Transition zones between monitored areas, as noted in the [mask documentation](../configuration/masks).

**Critical distinction - Motion masks vs. Object filter masks:** Motion masks only prevent motion from triggering detection. They do NOT prevent objects from being detected if object detection was started due to motion in unmasked areas. If you want to filter out false positive detections in specific locations, use object filter masks instead (covered in Section 5).

**Over-masking warning:** Be cautious about masking too much. Motion is used during object tracking to refine the object detection area in the next frame. Over-masking will make it more difficult for objects to be tracked. If an object walks from an unmasked area into a fully masked area, they essentially disappear and will be picked up as a "new" object if they leave the masked area.

### Motion Sensitivity Parameters

Frigate provides several parameters to fine-tune motion detection sensitivity. These work together to determine what constitutes "motion" worthy of triggering object detection.

**threshold:** The threshold passed to cv2.threshold to determine if a pixel is different enough to be counted as motion, as described in the [configuration reference](../configuration/reference).

```yaml
motion:
  threshold: 30
```

- **Range:** 1-255
- **Default:** 30
- **Higher values:** Make motion detection less sensitive (fewer false triggers)
- **Lower values:** Make motion detection more sensitive (may trigger on minor changes)
- **When to increase:** Cameras with noisy sensors, busy backgrounds, or frequent lighting changes
- **When to decrease:** Missing slow-moving objects or subtle motion

**contour_area:** Minimum size in pixels in the resized motion image that counts as motion.

```yaml
motion:
  contour_area: 10
```

- **Default:** 10
- **High sensitivity:** 10 (detects small movements like insects, leaves)
- **Medium sensitivity:** 30 (typical people and vehicle motion)
- **Low sensitivity:** 50 (only larger movements)
- **When to increase:** Reduce false triggers from small movements like insects or debris
- **When to decrease:** Ensure detection of small objects or distant motion

### Improve Contrast

The improve_contrast setting enables dynamic contrast improvement to help with challenging lighting conditions:

```yaml
motion:
  improve_contrast: True
```

**Benefits:**

- Helps improve night detections in low-light conditions
- Makes subtle motion more visible to the motion detection algorithm
- Particularly useful for cameras without good low-light performance

**Trade-offs:**

- May increase motion sensitivity during daytime
- Can cause more false triggers in high-contrast scenes
- Slightly increases CPU usage for motion processing

**When to enable:**

- Cameras struggling with night detection
- Low-quality cameras with poor dynamic range
- Scenes with challenging lighting (backlighting, deep shadows)

**When to disable:**

- Already experiencing too many false motion triggers
- High-quality cameras with good low-light performance
- CPU usage is a concern

### Debugging Motion Detection

To visualize and tune motion detection:

1. Navigate to your camera in the Frigate UI
2. Select "Debug" at from the settings cog
3. Enable "Motion boxes" in the options
4. Watch for red boxes showing detected motion areas

**What to look for:**

- **Constant motion boxes:** Indicates areas that should be masked
- **No motion boxes when objects move:** Motion detection may be too insensitive
- **Motion boxes everywhere:** Motion detection is too sensitive
- **Boxes not covering moving objects:** May need to adjust contour_area or threshold

**Iterative tuning process:**

1. Start with default settings
2. Identify problem areas using debug view
3. Add motion masks for constantly triggering areas
4. Adjust sensitivity parameters if needed
5. Test with real-world scenarios
6. Repeat until optimized

## 5. Object Detection Optimization

**Priority: Medium-High**

Once motion detection has identified areas worth analyzing, object detection determines what's actually in those regions. Proper configuration of object detection filters and tracking parameters ensures Frigate only tracks relevant objects and ignores false positives.

### Object Filters

Object filters allow you to ignore detections based on size, shape, confidence score, and location. These filters run after the AI model has identified an object, preventing Frigate from wasting resources tracking objects you don't care about.

**Basic filter configuration:**

```yaml
objects:
  track:
    - person
  filters:
    person:
      min_area: 5000
      max_area: 100000
      min_score: 0.5
      threshold: 0.7
```

**min_area:** Minimum size of the bounding box for the detected object.

- **Default:** 0 (no minimum)
- **Can be specified:** As pixels (width × height) or as a decimal percentage of frame (0.000001 to 0.99)
- **Example:** 5000 pixels filters out very small detections
- **Use case:** Ignore distant objects, insects, or detection artifacts
- **Tuning tip:** Check the bounding box size in the UI for objects you want to track, then set min_area slightly below that

**max_area:** Maximum size of the bounding box for the detected object.

- **Default:** 24000000 (essentially unlimited)
- **Can be specified:** As pixels or as a decimal percentage of frame
- **Example:** 100000 pixels prevents tracking objects that fill most of the frame
- **Use case:** Filter out false positives from camera adjustments, lens flares, or objects too close to camera
- **Tuning tip:** Objects filling >50% of frame are often false positives or not useful to track

**min_ratio:** Minimum width/height ratio of the bounding box.

```yaml
objects:
  filters:
    person:
      min_ratio: 0.5
```

- **Default:** 0 (no minimum)
- **Purpose:** Filter objects based on aspect ratio
- **Example:** 0.5 means width must be at least half the height
- **Use case:** People are typically taller than wide; very wide detections are likely false positives
- **Tuning tip:** Calculate ratio of typical objects (person standing ≈ 0.3-0.6, car ≈ 1.5-3.0)

**max_ratio:** Maximum width/height ratio of the bounding box.

```yaml
objects:
  filters:
    person:
      max_ratio: 2.0
```

- **Default:** 24000000 (essentially unlimited)
- **Example:** 2.0 means width can't exceed 2× the height
- **Use case:** Filter out horizontally stretched false positives
- **Tuning tip:** Adjust based on expected object orientations in your scene

**min_score:** Minimum score for the object to initiate tracking.

```yaml
objects:
  filters:
    person:
      min_score: 0.5
```

- **Default:** 0.5 (50% confidence)
- **Purpose:** Initial confidence threshold to start tracking an object
- **Range:** 0.0 to 1.0
- **Higher values:** Fewer false positives, but may miss valid detections
- **Lower values:** More detections captured, but more false positives
- **Tuning tip:** Start at 0.5, increase if too many false positives

**threshold:** Minimum decimal percentage for tracked object's computed score to be considered a true positive.

```yaml
objects:
  filters:
    person:
      threshold: 0.7
```

- **Default:** 0.7 (70% confidence)
- **Purpose:** Final threshold for an object to be saved/alerted
- **How it works:** Frigate tracks objects over multiple frames and calculates a median score; this must exceed the threshold
- **Difference from min_score:** min_score starts tracking, threshold confirms it's real
- **Minimum frames:** Takes at least 3 frames for Frigate to determine if an object meets the threshold
- **Tuning tip:** This is your primary tool for reducing false positives without missing detections

### Object Filter Masks

Object filter masks are different from motion masks. They filter out false positives for specific object types based on location, evaluated at the bottom center of the detected object's bounding box, as described in the [mask documentation](../configuration/masks).

See the [mask documentation](../configuration/masks) and [configuration reference](../configuration/reference) for more details.

**Global object mask:** The mask under the `objects` section applies to all tracked object types and is combined with object-specific masks.

**Object-specific masks:** Masks under specific object types (like `person`) only apply to that object type.

**Use cases:**

- Remove false positives in fixed locations (like a tree base frequently detected as a person)
- Prevent animals from being detected in areas they can't physically access

**How it works:** The bottom center of the bounding box is evaluated against the mask. If it falls in a masked area, the detection is assumed to be a false positive and ignored, as explained in the [mask documentation](../configuration/masks).

**Creating object filter masks:** Use the same mask creator tool in the UI (Settings → Mask / zone editor), but select "Object mask" instead of "Motion mask."

**Example scenario:** A tree base is frequently detected as a person. Use the Frigate UI to create a precise object filter mask over the location where the bottom center of the false detection typically appears.

## 6. Recording Configuration

**Priority: Medium**

Recording configuration impacts both storage requirements and system performance. Properly configured recording ensures you capture the footage you need without wasting disk space or CPU cycles.

### Retention Modes

Frigate offers three retention modes that determine which recording segments are kept. Each mode has different storage and CPU implications:

**all:** Save all recording segments regardless of activity.

```yaml
record:
  retain:
    days: 7
    mode: all
```

- **Storage impact:** Highest - stores everything continuously
- **CPU impact:** Moderate - still needs to manage and clean up old segments
- **Use case:** Critical areas requiring complete coverage, legal requirements
- **Disk usage:** ~1-3 GB per camera per day (depending on resolution/bitrate)

**motion:** Save all recording segments with any detected motion.

```yaml
record:
  retain:
    days: 7
    mode: motion
```

- **Storage impact:** Medium - only stores when motion detected
- **CPU impact:** Low - fewer segments to manage
- **Use case:** Most common configuration, balances coverage with storage
- **Disk usage:** ~200-800 MB per camera per day (depending on activity)
- **Note:** Motion detection must be enabled for this mode to work

**active_objects:** Save all recording segments with active/moving objects.

```yaml
record:
  retain:
    days: 7
    mode: active_objects
```

- **Storage impact:** Lowest - only stores when tracked objects are moving
- **CPU impact:** Lowest - minimal segments to manage
- **Use case:** Storage-constrained installations, focus on object events only
- **Disk usage:** ~50-300 MB per camera per day (depending on object activity)
- **Note:** Most efficient option but may miss motion-only events

**Important consideration:** If the retain mode for the camera is more restrictive than modes configured for alerts/detections, the segments will already be gone by the time those modes are applied. For example, if the camera retain mode is "motion", segments without motion are never stored, so setting alerts mode to "all" won't bring them back.

### Recording Enable/Disable

Recording must be enabled in the configuration to function:

```yaml
record:
  enabled: False
```

- **Default:** False (disabled)
- **Critical warning:** If recording is disabled in the config, turning it on via the UI or MQTT later will have no effect
- **Must be set to True:** To enable recording functionality
- **Can be overridden:** At the camera level for selective recording

**Camera-level override:**

```yaml
cameras:
  front_door:
    record:
      enabled: True
      retain:
        days: 30
```

## 7. System-Level Optimizations

**Priority: Medium**

Beyond camera and detection configuration, several system-level settings can significantly impact Frigate's performance and reliability.

### Shared Memory (shm-size)

Frigate uses shared memory to pass frames between processes efficiently. Insufficient shared memory will cause Frigate to crash with bus errors.

**Docker Compose configuration:**

```yaml
services:
  frigate:
    shm_size: "256mb"
```

**General guidelines:**

- **Minimum:** 128 MB for single camera installations
- **Typical:** 256 MB for 2-5 cameras
- **Large installations:** 512 MB - 1 GB for 10+ cameras or 4K streams
- **Symptoms of insufficient shm:** Bus error crashes, "Failed to create shared memory" errors

The Frigate UI and logs will warn you if your `shm_size` is too low.

### Tmpfs for Cache

Using a tmpfs (RAM disk) for Frigate's cache reduces disk wear and improves performance.

**Configuration:**

```yaml
volumes:
  - type: tmpfs
    target: /tmp/cache
    tmpfs:
      size: 1000000000 # 1 GB
```

**Benefits:**

- **Faster I/O:** RAM is orders of magnitude faster than disk
- **Reduced disk wear:** Eliminates constant write cycles to storage media
- **Lower latency:** Improves responsiveness for live viewing and clip generation
- **Extended hardware life:** Critical for SD cards and extends SSD lifespan

**Size recommendations:**

- **Minimum:** 500 MB for very small installations
- **Typical:** 1-2 GB for most installations
- **Large installations:** 4-8 GB for many cameras or high-resolution streams
- **Calculation:** Roughly 200-500 MB per camera depending on resolution

**Trade-offs:**

- **RAM usage:** Reduces available system RAM
- **Volatility:** Cache is lost on restart (not an issue for temporary cache)
- **System requirements:** Ensure sufficient RAM for OS, Frigate, and tmpfs

## 8. Understanding Resource Usage

**Priority: Educational**

Understanding how Frigate uses system resources helps you identify bottlenecks and optimize configuration effectively.

### CPU Usage Breakdown

Frigate's CPU usage comes from several distinct processes:

**Video Decoding:**

- **Primary CPU consumer** in most installations
- Decompresses video streams from cameras
- Scales with: resolution, frame rate, number of cameras, codec complexity
- **Mitigation:** Hardware acceleration (see Section 1)

**Motion Detection:**

- Analyzes pixel changes between frames
- Runs on every frame of every camera
- Scales with: detect resolution, frame rate, motion sensitivity settings
- **Mitigation:** Lower detect resolution, reduce FPS, use motion masks

**Detector CPU**:

- Prepares model inputs for inference on your object detection hardware
- Runs when motion is detected
- Scales with: frame rate, number of cameras, complexity of the object detection model
- **Mitigation**: Reduce motion sensitivity and detect fps, switch to a less complex model, add a second detector instance (`openvino` or `onnx`)

**FFmpeg Process Management:**

- Manages camera connections and stream handling
- Generally low overhead
- Can spike during reconnection attempts
- **Mitigation:** Stable network

**Database Operations:**

- Event storage and retrieval
- Generally minimal impact
- Can increase with very high event rates
- **Mitigation:** Proper retention settings, SSD storage

**Enrichments**:

- Semantic Search, Face recognition, LPR, custom classification
- Semantic Search generates embeddings for tracked object thumbnails. If run on the CPU, this may significantly drive up CPU usage
- Face recognition, LPR, and custom classification are usually lightweight, but if many faces, plates, or objects are detected, this can slow the pipeline
- **Mitigation**: Run Semantic Search on a GPU and/or disable other enrichments

**GenAI**:

- Generative AI for tracked object and review item descriptions
- Local (Ollama) and cloud providers are available. Using a local provider without a powerful GPU will significantly increase resource usage
- **Mitigation**: Offload to a cloud provider or use a powerful GPU for inference

**Web Interface:**

- Serving live streams and UI
- Increases with number of concurrent viewers
- WebRTC/MSE streaming via go2rtc
- **Mitigation:** Limit concurrent viewers, use sub-streams for viewing

### Resolution Impact

Resolution affects both CPU workload exponentially:

**CPU (Decoding) Impact:**

- **720p (1280×720):** Baseline reference point
- **1080p (1920×1080):** ~2.25× the pixels, roughly 2× the CPU load
- **4K (3840×2160):** ~9× the pixels of 720p, roughly 6-8× the CPU load
- **Why not linear:** Codec overhead, memory bandwidth, and cache efficiency

**Example comparison:**

- Decoding 720p stream: 15% CPU per camera
- Decoding 1080p stream: 30-35% CPU per camera
- Decoding 4K stream: 90-120% CPU per camera (may require multiple cores)

**Detector (Inference) Impact:**

The detector must analyze more pixels, but the impact depends on your model:

- **Fixed input models (320×320, 640×640):** Frigate resizes the frame to match model input, so resolution has minimal direct impact on inference time
- **Indirect impact:** Higher resolution means larger motion regions, potentially more detection runs
- **Region extraction:** Larger source frames require more CPU to crop detection regions

**Practical implications:**

- Use lowest resolution that meets detection needs for detect stream
- Save high resolution for record stream only
- 720p is the sweet spot for most detection scenarios
- 1080p only if detecting small/distant objects
- 4K almost never necessary for detection

### Memory Usage

Frigate's memory usage comes from several sources:

**Frame Buffers:**

- Raw decoded frames stored in shared memory
- Size: resolution × color depth × number of buffered frames
- Example: 1920×1080×3 bytes × 10 frames = ~62 MB per camera

**Object Tracking:**

- Metadata for each tracked object
- Minimal per object (~1-2 KB)
- Scales with number of simultaneous tracked objects

**Database Cache:**

- SQLite database held in memory for performance
- Typically 50-200 MB depending on history

**Python Process:**

- Frigate application overhead
- Generally 200-500 MB base usage
- Increases slightly with number of cameras

**Detector Model:**

- AI model loaded into detector memory
- OpenVINO/ONNX: 50-200 MB depending on model
- GPU VRAM: 500 MB - 2 GB depending on model and batch size

**Enrichments:**

- Semantic Search, LPR, Face Recognition, and custom classification models loaded into memory
- Depending on the enrichment, these models can be quite large. Semantic Search: ~4-6GB, Face Recognition, LPR, custom classification: ~500MB-1GB

**Total memory recommendations:**

- **Minimal (1-2 cameras):** 2 GB RAM
- **Small (3-5 cameras):** 4 GB RAM
- **Medium (6-10 cameras):** 8 GB RAM
- **Large (10+ cameras):** 16 GB+ RAM

### Storage Usage

Storage requirements vary dramatically based on configuration:

**Recording storage by mode:**

**Mode: all (continuous recording)**

- 1080p @ 15 FPS, 2 Mbps: ~21 GB per camera per day
- 1080p @ 30 FPS, 4 Mbps: ~43 GB per camera per day
- 4K @ 15 FPS, 8 Mbps: ~86 GB per camera per day
- 4K @ 30 FPS, 16 Mbps: ~173 GB per camera per day

**Mode: motion**

- Depends heavily on activity level
- Low activity (suburban home): 3–8 GB per camera per day
- Medium activity (urban home): 8–20 GB per camera per day
- High activity (retail, busy street): 20–50 GB per camera per day

**Mode: active_objects**

- Most efficient, only records when objects detected
- Low activity: 1–3 GB per camera per day
- Medium activity: 3–8 GB per camera per day
- High activity: 8–15 GB per camera per day

**Database storage:**

- Grows with number of events
- Typical: 100–300 MB for months of events
- Cleaned automatically based on retention settings

**Clips and snapshots:**

- Stored separately from recordings
- Size depends on alert/detection frequency
- Typical: 100–500 MB per camera per month

**Storage planning example:**

```
5 cameras, 1080p recording, motion mode, 14 day retention:
5 cameras × 10 GB/day × 14 days = 700 GB minimum
Add 30% buffer: ~900 GB recommended
```

### Network Bandwidth

Network bandwidth impacts both camera-to-Frigate and Frigate-to-client connections:

**Camera to Frigate (inbound):**

- Depends on camera bitrate and number of streams
- 1080p @ 2 Mbps: 2 Mbps per stream
- If using separate detect and record streams: sum both streams
- Example: 5 cameras × (2 Mbps detect + 4 Mbps record) = 30 Mbps total

**Frigate to Clients (outbound):**

- Live viewing via WebRTC/MSE through go2rtc
- Each viewer consumes full stream bandwidth
- Example: 3 viewers watching 1080p @ 4 Mbps = 12 Mbps outbound
- Mitigation: Use lower bitrate sub-streams for live viewing

**MQTT traffic:**

- Minimal, typically less than 1 Mbps even with many cameras
- Event notifications and state updates

**API traffic:**

- Varies with UI usage and integrations
- Generally negligible compared to video streams

### Identifying Bottlenecks

**Symptoms and causes:**

**High CPU usage:**

- **Cause:** Video decoding without hardware acceleration
- **Solution:** Enable hwaccel_args (Section 1)
- **Cause:** High detect resolution or FPS
- **Solution:** Lower detect resolution/FPS (Section 3)

**Detector CPU Usage at 100%:**

- **Cause:** Too many cameras or too much motion
- **Solution:** Add second detector instance (Section 2)
- **Cause:** Model too complex for hardware
- **Solution:** Use smaller/faster model

**Detection FPS below configured FPS:**

- **Cause:** System can't keep up with configured rate
- **Solution:** Reduce detect FPS, add hardware acceleration, add detector
- **Cause:** Excessive motion triggering constant detection
- **Solution:** Add motion masks (Section 4)

**Recording gaps or stuttering:**

- **Cause:** Insufficient disk I/O performance
- **Solution:** Use faster storage (SSD), reduce recording resolution
- **Cause:** Network issues with camera
- **Solution:** Check network stability

**Out of memory crashes:**

- **Cause:** Insufficient shared memory
- **Solution:** Increase shm_size (Section 7)
- **Cause:** Too many simultaneous high-resolution streams
- **Solution:** Reduce number of cameras or resolution

**Slow UI/high latency:**

- **Cause:** Too many concurrent viewers
- **Solution:** Limit viewers, use sub-streams for viewing
- **Cause:** Slow database storage
- **Solution:** Move database to SSD

## 9. Monitoring and Troubleshooting

**Priority: Medium**

Effective monitoring helps you identify performance issues before they impact your system's reliability.

### Frigate UI Metrics

The Frigate web interface provides real-time performance metrics:

**System Stats (Debug page):**

- **CPU Usage:** Overall system CPU percentage
- **Detector Inference Speed:** Milliseconds per detection
- **Detection FPS:** Actual detections per second being processed
- **Process FPS:** Frames being processed per second
- **Skipped FPS:** Frames skipped due to system overload

**Camera-specific stats:**

- **Camera FPS:** Actual frame rate from camera
- **Detection FPS:** Rate at which this camera's frames are being analyzed
- **Process FPS:** Rate at which frames are being decoded
- **Skipped FPS:** Frames dropped due to processing delays

**What to monitor:**

- **Detection FPS approaching detector capacity:** Time to add detector
- **Skipped FPS > 0:** System falling behind, needs optimization
- **Process FPS < Camera FPS:** Decoding bottleneck, enable hwaccel
- **Inference speed increasing:** Detector struggling, may need upgrade

### Log Analysis

Frigate logs provide detailed information about system behavior and errors:

**Key log messages to watch for:**

**"FFmpeg process crashed unexpectedly"**

- **Cause:** Camera stream issues, network problems, or invalid FFmpeg args
- **Solution:** Check camera accessibility, verify FFmpeg configuration
- **Debug:** Enable FFmpeg logging to see detailed error

**"Detection appears to be stuck"**

- **Cause:** Detector process hung or overloaded
- **Solution:** Restart Frigate, check detector hardware, add second detector
- **Prevention:** Monitor detector usage, don't exceed capacity

**"Unable to read frames from camera"**

- **Cause:** Network issues, camera offline, or authentication failure
- **Solution:** Verify camera network connection, check credentials
- **Note:** Normal during camera reboots or brief outages

**"Insufficient shared memory"**

- **Cause:** shm_size too small for configured cameras
- **Solution:** Increase shm_size in Docker configuration (Section 7)
- **Critical:** Will cause crashes if not addressed

**"Skipping frame, detection queue is full"**

- **Cause:** Detector can't keep up with detection requests
- **Solution:** Add second detector, reduce detect FPS, add motion masks
- **Impact:** Missing potential detections during high activity

### Setting Log Levels

Adjust log verbosity for troubleshooting:

```yaml
logger:
  default: info
  logs:
    frigate.event: debug
    frigate.record: debug
```

**Log levels:**

- **error:** Only critical errors (minimal logging)
- **warning:** Errors and warnings (recommended for production)
- **info:** General information (default, good balance)
- **debug:** Detailed debugging information (troubleshooting only)

**Component-specific logging:**

- `frigate.event`: Object detection and tracking events
- `frigate.record`: Recording and retention operations
- `frigate.mqtt`: MQTT communication
- `frigate.object_processing`: Object detection processing
- `frigate.motion`: Motion detection

**Best practices:**

- Use `info` for default level in production
- Enable `debug` only for specific components when troubleshooting
- Excessive debug logging can impact performance
- Review logs regularly for warnings and errors

### Debug View

The debug view in Frigate UI is essential for optimization:

**Accessing debug view:**

1. Navigate to camera in Frigate UI
2. Click "Debug" from the Settings cog
3. Enable visualization options

**Debug overlays:**

**Motion boxes (red):**

- Shows areas where motion was detected
- Helps identify areas to mask
- Reveals motion detection sensitivity issues

**Regions (green):**

- Shows areas sent to detector for object detection
- Should correspond to motion boxes
- Large regions indicate inefficient detection

**Objects (blue):**

- Shows detected objects with labels and confidence scores
- Helps tune min_score and threshold values
- Reveals false positives and missed detections

**Zones (purple):**

- Shows defined zones if configured
- Helps verify zone coverage
- Useful for zone-based filtering

**Using debug view for optimization:**

1. Enable motion boxes to identify constant motion areas
2. Add motion masks for these areas
3. Enable objects to see detection confidence scores
4. Adjust threshold if too many low-confidence detections
5. Verify regions aren't excessively large

## 10. Hardware Upgrade Path

**Priority: Reference**

When software optimization isn't enough, hardware upgrades provide the next performance tier.

### Upgrade Priority Order

**1. Add a dedicated detector (Highest impact)**

If using a CPU detector, adding any dedicated detector provides massive improvement:

**Hailo-8L M.2:**

- Similar performance to Coral
- M.2 form factor for cleaner installation
- Good alternative if Coral unavailable

**Intel Arc A310/A380:**

- Excellent for OpenVINO
- Also provides hardware decode acceleration
- Supports 10-20 cameras
- Dual benefit: detection + hwaccel

**2. Enable hardware decode acceleration (High impact)**

If using CPU for video decoding:

**Intel CPU with QuickSync (6th gen+):**

- Already have it if using Intel CPU
- Just enable VA-API in configuration
- Reduces CPU usage 50-80%
- Supports many simultaneous streams

**Add discrete GPU for decode:**

- Intel Arc A310: excellent decode + OpenVINO
- NVIDIA GTX 1650: good decode + TensorRT option
- Dedicated decode hardware frees CPU

**3. Add second detector instance (Medium-high impact)**

When single detector at capacity:

**Requirements:**

- Sufficient GPU VRAM (for GPU detectors)
- Or second physical detector (second `openvino` or `onnx` instance)
- Minimal configuration change, but not supported by all detector types

**Benefit:**

- Doubles detection capacity
- Handles twice as many cameras
- Reduces detection latency during peaks

**4. Upgrade CPU (Medium impact)**

If decode is bottleneck even with hwaccel:

**Intel 12th gen+ with better QuickSync:**

- Improved decode efficiency
- More streams per CPU
- Better integrated GPU performance

**Higher core count:**

- More parallel decode streams
- Better for many cameras
- Diminishing returns beyond 8 cores for Frigate

**5. Upgrade storage (Low-medium impact)**

If experiencing recording issues:

**NVMe SSD:**

- Fastest I/O for database and recordings
- Reduces latency for clip generation
- Essential for 10+ cameras

**Dedicated recording drive:**

- Separate OS/database from recordings
- Prevents recording I/O from impacting system
- Can use slower/cheaper storage for recordings

**6. Increase RAM (Low impact)**

Usually not the bottleneck, but needed if:

- Running many other services
- Using very large tmpfs cache
- 20+ cameras with high resolution

**Recommendations:**

- 4 GB minimum for Frigate
- 8 GB comfortable for most installations
- 16 GB for large installations or shared server

### Hardware Recommendations by Scale

**Small Installation (1-3 cameras):**

- **Minimum:** Raspberry Pi 4 (4GB) + Coral
- **Better:** Intel N100 mini PC (built-in QuickSync + Coral)
- **Best:** Intel N100 + Coral

**Medium Installation (4-8 cameras):**

- **Minimum:** Intel 8th gen+ CPU
- **Better:** Intel 12th gen+ with integrated GPU + Hailo or MemryX
- **Best:** Intel with Arc A310 (decode + OpenVINO or Hailo/MemryX)

  **Large Installation (9-15 cameras):**

- **Minimum:** Intel 10th gen+ + OpenVINO or Hailo or MemryX
- **Better:** Intel 12th gen+ + Hailo-8 or MemryX
- **Best:** Intel with Arc A380 (decode + OpenVINO) or NVIDIA RTX 3060 (decode + ONNX)

**Very Large Installation (16+ cameras):**

- **Minimum:** Intel 12th gen+ + 2× Hailo-8L
- **Better:** Dedicated server with NVIDIA RTX 3060/4060 + TensorRT
- **Best:** Server-grade Intel with Arc A770 or NVIDIA RTX 4070

### When to Upgrade vs. Optimize

**Optimize first if:**

- CPU usage less than 80% average
- Detector usage less than 85%
- No skipped frames
- Sufficient RAM available
- Storage not full

**Consider hardware upgrade if:**

- CPU consistently >90% even with hwaccel enabled
- Detector at 100% with optimized config
- Skipped frames even with reduced FPS
- Out of memory errors despite proper shm_size
- Cannot add more cameras without degradation

**Optimization checklist before upgrading:**

1. ✓ Hardware acceleration enabled? See the [hardware acceleration documentation](../configuration/hardware_acceleration_video).
2. ✓ Detect resolution ≤720p? See the [getting started guide](../guides/getting_started).
3. ✓ Detect FPS ≤5?
4. ✓ Motion masks configured?
5. ✓ Separate detect/record streams?
6. ✓ Object filters tuned? See the [configuration reference](../configuration/reference).
7. ✓ Using efficient retention mode?
8. ✓ Tmpfs cache configured? See the [getting started guide](../guides/getting_started).

If all optimizations applied and still insufficient, hardware upgrade is justified.

## 11. Common Performance Issues and Solutions

### Issue: High CPU Usage Despite Hardware Acceleration

**Symptoms:**

- CPU at 80-100% even with hwaccel enabled
- FFmpeg processes consuming excessive CPU
- System becoming unresponsive

**Diagnostic steps:**

1. Verify hwaccel actually working (check logs for errors) in the [hardware acceleration documentation](../configuration/hardware_acceleration_video).
2. Confirm GPU device accessible in container
3. Check if using correct preset for your hardware
4. Verify camera streams are compatible codec (H.264/H.265)

**Solutions:**

- Ensure Docker container has GPU device access
- Try different hwaccel preset if auto-detection fails
- Check camera codec compatibility
- Reduce number of simultaneous streams
- Lower detect resolution further

### Issue: Detector CPU Usage at 100%

**Symptoms:**

- Detection FPS below configured FPS
- "Skippped detections" noted in Camera Metrics
- Delayed object detection in UI
- Objects appearing/disappearing erratically

**Diagnostic steps:**

1. Check Detector CPU usage in Frigate UI System Metrics
2. Review inference speed (should be fairly consistent)
3. Count total detect FPS across all cameras
4. Calculate if exceeding detector capacity

**Solutions:**

- Add second detector instance as described in the [detector documentation](../configuration/object_detectors).
- Reduce detect FPS from 5 to 3 in the [getting started guide](../guides/getting_started).
- Add motion masks to reduce detection triggers
- Increase object filter thresholds in the [configuration reference](../configuration/reference).
- Consider upgrading detector hardware as described in the [detector documentation](../configuration/object_detectors).

### Issue: Recording Gaps or Missing Footage

**Symptoms:**

- Gaps in timeline
- "FFmpeg process crashed" errors
- Intermittent camera connectivity

**Diagnostic steps:**

1. Check FFmpeg logs for specific errors
2. Verify network stability to cameras
3. Check storage space and I/O performance
4. Review retry_interval setting in the [configuration reference](../configuration/reference).

**Solutions:**

- Increase retry_interval for wireless cameras
- Verify network infrastructure (switches, WiFi)
- Check camera firmware for known issues
- Ensure sufficient storage and fast enough disk
- Consider wired connection for critical cameras

### Issue: Out of Memory or Bus Errors

**Symptoms:**

- Frigate crashes with bus error
- "Failed to create shared memory" errors
- Container restarts frequently
- System becomes unresponsive

**Diagnostic steps:**

1. Check configured shm_size in the [getting started guide](../guides/getting_started).
2. Calculate actual requirements based on cameras
3. Review system memory usage
4. Check for memory leaks (increasing over time)

**Solutions:**

- Increase shm_size in Docker configuration
- Add tmpfs volume for cache
- Reduce number of cameras or resolution
- Ensure sufficient system RAM
- Restart Frigate to clear any memory leaks

### Issue: Slow UI or High Latency

**Symptoms:**

- UI takes long to load
- Live view stuttering or delayed
- Clip playback buffering
- Timeline loading slowly

**Diagnostic steps:**

1. Check number of concurrent viewers
2. Review network bandwidth usage
3. Check database size and location
4. Verify go2rtc performance

**Solutions:**

- Limit concurrent viewers
- Use sub-streams for live viewing
- Move database to SSD
- Optimize go2rtc configuration
- Reduce recording retention to shrink database

## Conclusion

Optimizing Frigate performance requires a systematic approach across multiple areas. The highest-impact optimizations are:

1. **Enable hardware acceleration for video decoding** in the [hardware acceleration documentation](../configuration/hardware_acceleration_video) - Reduces CPU usage by 50-80%
2. **Use a dedicated detector** in the [detector documentation](../configuration/object_detectors) - 10-20× faster than CPU detection
3. **Configure appropriate detect resolution and FPS** in the [getting started guide](../guides/getting_started) - Balance accuracy with resources
4. **Implement motion masks**- Reduce unnecessary detection cycles
5. **Use separate detect and record streams**- Optimize each stream for its purpose

Start with these foundational optimizations, then fine-tune based on your specific hardware and requirements. Monitor system metrics regularly to identify bottlenecks and validate improvements. When software optimization reaches its limits, strategic hardware upgrades provide the next performance tier.

Remember that every installation is unique - what works optimally for one setup may need adjustment for another. Use the debug view, logs, and system metrics to guide your optimization decisions rather than blindly copying configurations.
