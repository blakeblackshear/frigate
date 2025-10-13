---
id: autotracking
title: Camera Autotracking
---

An ONVIF-capable, PTZ (pan-tilt-zoom) camera that supports relative movement within the field of view (FOV) can be configured to automatically track moving objects and keep them in the center of the frame.

![Autotracking example with zooming](/img/frigate-autotracking-example.gif)

## Autotracking behavior

Once Frigate determines that an object is not a false positive and has entered one of the required zones, the autotracker will move the PTZ camera to keep the object centered in the frame until the object either moves out of the frame, the PTZ is not capable of any more movement, or Frigate loses track of it.

Upon loss of tracking, Frigate will scan the region of the lost object for `timeout` seconds. If an object of the same type is found in that region, Frigate will autotrack that new object.

When tracking has ended, Frigate will return to the camera firmware's PTZ preset specified by the `return_preset` configuration entry.

## Checking ONVIF camera support

Frigate autotracking functions with PTZ cameras capable of relative movement within the field of view (as specified in the [ONVIF spec](https://www.onvif.org/specs/srv/ptz/ONVIF-PTZ-Service-Spec-v1712.pdf) as `RelativePanTiltTranslationSpace` having a `TranslationSpaceFov` entry).

Many cheaper or older PTZs may not support this standard. Frigate will report an error message in the log and disable autotracking if your PTZ is unsupported.

The FeatureList on the [ONVIF Conformant Products Database](https://www.onvif.org/conformant-products/) can provide a starting point to determine a camera's compatibility with Frigate's autotracking. Look to see if a camera lists `PTZRelative`, `PTZRelativePanTilt` and/or `PTZRelativeZoom`. These features are required for autotracking, but some cameras still fail to respond even if they claim support.

A growing list of cameras and brands that have been reported by users to work with Frigate's autotracking can be found [here](cameras.md).

## Configuration

First, set up a PTZ preset in your camera's firmware and give it a name. If you're unsure how to do this, consult the documentation for your camera manufacturer's firmware. Some tutorials for common brands: [Amcrest](https://www.youtube.com/watch?v=lJlE9-krmrM), [Reolink](https://www.youtube.com/watch?v=VAnxHUY5i5w), [Dahua](https://www.youtube.com/watch?v=7sNbc5U-k54).

Edit your Frigate configuration file and enter the ONVIF parameters for your camera. Specify the object types to track, a required zone the object must enter to begin autotracking, and the camera preset name you configured in your camera's firmware to return to when tracking has ended. Optionally, specify a delay in seconds before Frigate returns the camera to the preset.

An [ONVIF connection](cameras.md) is required for autotracking to function. Also, a [motion mask](masks.md) over your camera's timestamp and any overlay text is recommended to ensure they are completely excluded from scene change calculations when the camera is moving.

Note that `autotracking` is disabled by default but can be enabled in the configuration or by MQTT.

```yaml
cameras:
  ptzcamera:
    ...
    onvif:
      # Required: host of the camera being connected to.
      # NOTE: HTTP is assumed by default; HTTPS is supported if you specify the scheme, ex: "https://0.0.0.0".
      host: 0.0.0.0
      # Optional: ONVIF port for device (default: shown below).
      port: 8000
      # Optional: username for login.
      # NOTE: Some devices require admin to access ONVIF.
      user: admin
      # Optional: password for login.
      password: admin
      # Optional: Skip TLS verification from the ONVIF server (default: shown below)
      tls_insecure: False
      # Optional: PTZ camera object autotracking. Keeps a moving object in
      # the center of the frame by automatically moving the PTZ camera.
      autotracking:
        # Optional: enable/disable object autotracking. (default: shown below)
        enabled: False
        # Optional: calibrate the camera on startup (default: shown below)
        # A calibration will move the PTZ in increments and measure the time it takes to move.
        # The results are used to help estimate the position of tracked objects after a camera move.
        # Frigate will update your config file automatically after a calibration with
        # a "movement_weights" entry for the camera. You should then set calibrate_on_startup to False.
        calibrate_on_startup: False
        # Optional: the mode to use for zooming in/out on objects during autotracking. (default: shown below)
        # Available options are: disabled, absolute, and relative
        #   disabled - don't zoom in/out on autotracked objects, use pan/tilt only
        #   absolute - use absolute zooming (supported by most PTZ capable cameras)
        #   relative - use relative zooming (not supported on all PTZs, but makes concurrent pan/tilt/zoom movements)
        zooming: disabled
        # Optional: A value to change the behavior of zooming on autotracked objects. (default: shown below)
        # A lower value will keep more of the scene in view around a tracked object.
        # A higher value will zoom in more on a tracked object, but Frigate may lose tracking more quickly.
        # The value should be between 0.1 and 0.75
        zoom_factor: 0.3
        # Optional: list of objects to track from labelmap.txt (default: shown below)
        track:
          - person
        # Required: Begin automatically tracking an object when it enters any of the listed zones.
        required_zones:
          - zone_name
        # Required: Name of ONVIF preset in camera's firmware to return to when tracking is over. (default: shown below)
        return_preset: home
        # Optional: Seconds to delay before returning to preset. (default: shown below)
        timeout: 10
        # Optional: Values generated automatically by a camera calibration. Do not modify these manually. (default: shown below)
        movement_weights: []
```

## Calibration

PTZ motors operate at different speeds. Performing a calibration will direct Frigate to measure this speed over a variety of movements and use those measurements to better predict the amount of movement necessary to keep autotracked objects in the center of the frame.

Calibration is optional, but will greatly assist Frigate in autotracking objects that move across the camera's field of view more quickly.

To begin calibration, set the `calibrate_on_startup` for your camera to `True` and restart Frigate. Frigate will then make a series of small and large movements with your camera. Don't move the PTZ manually while calibration is in progress. Once complete, camera motion will stop and your config file will be automatically updated with a `movement_weights` parameter to be used in movement calculations. You should not modify this parameter manually.

After calibration has ended, your PTZ will be moved to the preset specified by `return_preset`.

:::note

Frigate's web UI and all other cameras will be unresponsive while calibration is in progress. This is expected and normal to avoid excessive network traffic or CPU usage during calibration. Calibration for most PTZs will take about two minutes. The Frigate log will show calibration progress and any errors.

:::

At this point, Frigate will be running and will continue to refine and update the `movement_weights` parameter in your config automatically as the PTZ moves during autotracking and more measurements are obtained.

Before restarting Frigate, you should set `calibrate_on_startup` in your config file to `False`, otherwise your refined `movement_weights` will be overwritten and calibration will occur when starting again.

You can recalibrate at any time by removing the `movement_weights` parameter, setting `calibrate_on_startup` to `True`, and then restarting Frigate. You may need to recalibrate or remove `movement_weights` from your config altogether if autotracking is erratic. If you change your `return_preset` in any way or if you change your camera's detect `fps` value, a recalibration is also recommended.

If you initially calibrate with zooming disabled and then enable zooming at a later point, you should also recalibrate.

## Best practices and considerations

Every PTZ camera is different, so autotracking may not perform ideally in every situation. This experimental feature was initially developed using an EmpireTech/Dahua SD1A404XB-GNR.

The object tracker in Frigate estimates the motion of the PTZ so that tracked objects are preserved when the camera moves. In most cases 5 fps is sufficient, but if you plan to track faster moving objects, you may want to increase this slightly. Higher frame rates (> 10fps) will only slow down Frigate and the motion estimator and may lead to dropped frames, especially if you are using experimental zooming.

A fast [detector](object_detectors.md) is recommended. CPU detectors will not perform well or won't work at all. You can watch Frigate's debug viewer for your camera to see a thicker colored box around the object currently being autotracked.

![Autotracking Debug View](/img/autotracking-debug.gif)

A full-frame zone in `required_zones` is not recommended, especially if you've calibrated your camera and there are `movement_weights` defined in the configuration file. Frigate will continue to autotrack an object that has entered one of the `required_zones`, even if it moves outside of that zone.

Some users have found it helpful to adjust the zone `inertia` value. See the [configuration reference](index.md).

## Zooming

Zooming is a very experimental feature and may use significantly more CPU when tracking objects than panning/tilting only.

Absolute zooming makes zoom movements separate from pan/tilt movements. Most PTZ cameras will support absolute zooming. Absolute zooming was developed to be very conservative to work best with a variety of cameras and scenes. Absolute zooming usually will not occur until an object has stopped moving or is moving very slowly.

Relative zooming attempts to make a zoom movement concurrently with any pan/tilt movements. It was tested to work with some Dahua and Amcrest PTZs. But the ONVIF specification indicates that there no assumption about how the generic zoom range is mapped to magnification, field of view or other physical zoom dimension when using relative zooming. So if relative zooming behavior is erratic or just doesn't work, try absolute zooming.

You can optionally adjust the `zoom_factor` for your camera in your configuration file. Lower values will leave more space from the scene around the tracked object while higher values will cause your camera to zoom in more on the object. However, keep in mind that Frigate needs a fair amount of pixels and scene details outside of the bounding box of the tracked object to estimate the motion of your camera. If the object is taking up too much of the frame, Frigate will not be able to track the motion of the camera and your object will be lost.

The range of this option is from 0.1 to 0.75. The default value of 0.3 is conservative and should be sufficient for most users. Because every PTZ and scene is different, you should experiment to determine what works best for you.

## Usage applications

In security and surveillance, it's common to use "spotter" cameras in combination with your PTZ. When your fixed spotter camera detects an object, you could use an automation platform like Home Assistant to move the PTZ to a specific preset so that Frigate can begin automatically tracking the object. For example: a residence may have fixed cameras on the east and west side of the property, capturing views up and down a street. When the spotter camera on the west side detects a person, a Home Assistant automation could move the PTZ to a camera preset aimed toward the west. When the object enters the specified zone, Frigate's autotracker could then continue to track the person as it moves out of view of any of the fixed cameras.

## Troubleshooting and FAQ

### The autotracker loses track of my object. Why?

There are many reasons this could be the case. If you are using experimental zooming, your `zoom_factor` value might be too high, the object might be traveling too quickly, the scene might be too dark, there are not enough details in the scene (for example, a PTZ looking down on a driveway or other monotone background without a sufficient number of hard edges or corners), or the scene is otherwise less than optimal for Frigate to maintain tracking.

Your camera's shutter speed may also be set too low so that blurring occurs with motion. Check your camera's firmware to see if you can increase the shutter speed.

Watching Frigate's debug view can help to determine a possible cause. The autotracked object will have a thicker colored box around it.

### I'm seeing an error in the logs that my camera "is still in ONVIF 'MOVING' status." What does this mean?

There are two possible known reasons for this (and perhaps others yet unknown): a slow PTZ motor or buggy camera firmware. Frigate uses an ONVIF parameter provided by the camera, `MoveStatus`, to determine when the PTZ's motor is moving or idle. According to some users, Hikvision PTZs (even with the latest firmware), are not updating this value after PTZ movement. Unfortunately there is no workaround to this bug in Hikvision firmware, so autotracking will not function correctly and should be disabled in your config. This may also be the case with other non-Hikvision cameras utilizing Hikvision firmware.

### I tried calibrating my camera, but the logs show that it is stuck at 0% and Frigate is not starting up.

This is often caused by the same reason as above - the `MoveStatus` ONVIF parameter is not changing due to a bug in your camera's firmware. Also, see the note above: Frigate's web UI and all other cameras will be unresponsive while calibration is in progress. This is expected and normal. But if you don't see log entries every few seconds for calibration progress, your camera is not compatible with autotracking.

### I'm seeing this error in the logs: "Autotracker: motion estimator couldn't get transformations". What does this mean?

To maintain object tracking during PTZ moves, Frigate tracks the motion of your camera based on the details of the frame. If you are seeing this message, it could mean that your `zoom_factor` may be set too high, the scene around your detected object does not have enough details (like hard edges or color variations), or your camera's shutter speed is too slow and motion blur is occurring. Try reducing `zoom_factor`, finding a way to alter the scene around your object, or changing your camera's shutter speed.

### Calibration seems to have completed, but the camera is not actually moving to track my object. Why?

Some cameras have firmware that reports that FOV RelativeMove, the ONVIF command that Frigate uses for autotracking, is supported. However, if the camera does not pan or tilt when an object comes into the required zone, your camera's firmware does not actually support FOV RelativeMove. One such camera is the Uniview IPC672LR-AX4DUPK. It actually moves its zoom motor instead of panning and tilting and does not follow the ONVIF standard whatsoever.

### Frigate reports an error saying that calibration has failed. Why?

Calibration measures the amount of time it takes for Frigate to make a series of movements with your PTZ. This error message is recorded in the log if these values are too high for Frigate to support calibrated autotracking. This is often the case when your camera's motor or network connection is too slow or your camera's firmware doesn't report the motor status in a timely manner. You can try running without calibration (just remove the `movement_weights` line from your config and restart), but if calibration fails, this often means that autotracking will behave unpredictably.
