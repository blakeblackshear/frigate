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

Alternatively, you can download and run [this simple Python script](https://gist.github.com/hawkeye217/152a1d4ba80760dac95d46e143d37112), replacing the details on line 4 with your camera's IP address, ONVIF port, username, and password to check your camera.

## Configuration

First, set up a PTZ preset in your camera's firmware and give it a name. If you're unsure how to do this, consult the documentation for your camera manufacturer's firmware. Some tutorials for common brands: [Amcrest](https://www.youtube.com/watch?v=lJlE9-krmrM), [Reolink](https://www.youtube.com/watch?v=VAnxHUY5i5w), [Dahua](https://www.youtube.com/watch?v=7sNbc5U-k54).

Edit your Frigate configuration file and enter the ONVIF parameters for your camera. Specify the object types to track, a required zone the object must enter to begin autotracking, and the camera preset name you configured in your camera's firmware to return to when tracking has ended. Optionally, specify a delay in seconds before Frigate returns the camera to the preset.

An [ONVIF connection](cameras.md) is required for autotracking to function.

Note that `autotracking` is disabled by default but can be enabled in the configuration or by MQTT.

```yaml
cameras:
  ptzcamera:
    ...
    onvif:
      # Required: host of the camera being connected to.
      host: 0.0.0.0
      # Optional: ONVIF port for device (default: shown below).
      port: 8000
      # Optional: username for login.
      # NOTE: Some devices require admin to access ONVIF.
      user: admin
      # Optional: password for login.
      password: admin
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

To begin calibration, set the `calibrate_on_startup` for your camera to `True` and restart Frigate. Frigate will then make a series of 30 small and large movements with your camera. Don't move the PTZ manually while calibration is in progress. Once complete, camera motion will stop and your config file will be automatically updated with a `movement_weights` parameter to be used in movement calculations. You should not modify this parameter manually.

After calibration has ended, your PTZ will be moved to the preset specified by `return_preset` and you should set `calibrate_on_startup` in your config file to `False`.

Note that Frigate will refine and update the `movement_weights` parameter in your config automatically as the PTZ moves during autotracking and more measurements are obtained.

You can recalibrate at any time by removing the `movement_weights` parameter, setting `calibrate_on_startup` to `True`, and then restarting Frigate. You may need to recalibrate or remove `movement_weights` from your config altogether if autotracking is erratic. If you change your `return_preset` in any way, a recalibration is also recommended.

## Best practices and considerations

Every PTZ camera is different, so autotracking may not perform ideally in every situation. This experimental feature was initially developed using an EmpireTech/Dahua SD1A404XB-GNR.

The object tracker in Frigate estimates the motion of the PTZ so that tracked objects are preserved when the camera moves. In most cases (especially for faster moving objects), the default 5 fps is insufficient for the motion estimator to perform accurately. 10 fps is the current recommendation. Higher frame rates will likely not be more performant and will only slow down Frigate and the motion estimator. Adjust your camera to output at least 10 frames per second and change the `fps` parameter in the [detect configuration](index.md) of your configuration file.

A fast [detector](object_detectors.md) is recommended. CPU detectors will not perform well or won't work at all. You can watch Frigate's debug viewer for your camera to see a thicker colored box around the object currently being autotracked.

![Autotracking Debug View](/img/autotracking-debug.gif)

A full-frame zone in `required_zones` is not recommended, especially if you've calibrated your camera and there are `movement_weights` defined in the configuration file. Frigate will continue to autotrack an object that has entered one of the `required_zones`, even if it moves outside of that zone.

## Zooming

Zooming is still a very experimental feature and may use significantly more CPU when tracking objects than panning/tilting only. It may be helpful to tweak your camera's autofocus settings if you are noticing focus problems when using zooming.

Absolute zooming makes zoom movements separate from pan/tilt movements. Most PTZ cameras will support absolute zooming.

Relative zooming attempts to make a zoom movement concurrently with any pan/tilt movements. It was tested to work with some Dahua and Amcrest PTZs. But the ONVIF specification indicates that there no assumption about how the generic zoom range is mapped to magnification, field of view or other physical zoom dimension when using relative zooming. So if relative zooming behavior is erratic or just doesn't work, use absolute zooming.

You can optionally adjust the `zoom_factor` for your camera in your configuration file. Lower values will leave more space from the scene around the tracked object while higher values will cause your camera to zoom in more on the object. However, keep in mind that Frigate needs a fair amount of pixels and scene details outside of the bounding box of the tracked object to estimate the motion of your camera. If the object is taking up too much of the frame, Frigate will not be able to track the motion of the camera and your object will be lost.

The range of this option is from 0.1 to 0.75. The default value of 0.3 should be sufficient for most users. If you have a powerful zoom lens on your PTZ or you find your autotracked objects are often lost, you may want to lower this value. Because every PTZ and scene is different, you should experiment to determine what works best for you.

## Usage applications

In security and surveillance, it's common to use "spotter" cameras in combination with your PTZ. When your fixed spotter camera detects an object, you could use an automation platform like Home Assistant to move the PTZ to a specific preset so that Frigate can begin automatically tracking the object. For example: a residence may have fixed cameras on the east and west side of the property, capturing views up and down a street. When the spotter camera on the west side detects a person, a Home Assistant automation could move the PTZ to a camera preset aimed toward the west. When the object enters the specified zone, Frigate's autotracker could then continue to track the person as it moves out of view of any of the fixed cameras.
