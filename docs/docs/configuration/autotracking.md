---
id: autotracking
title: Camera Autotracking
---

An ONVIF-capable, PTZ (pan-tilt-zoom) camera that supports relative movement within the field of view (FOV) can be configured to automatically track moving objects and keep them in the center of the frame.

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
```

## Best practices and considerations

Every PTZ camera is different, so autotracking may not perform ideally in every situation. This experimental feature was initially developed using an EmpireTech/Dahua SD1A404XB-GNR.

The object tracker in Frigate estimates the motion of the PTZ so that tracked objects are preserved when the camera moves. In most cases (especially for faster moving objects), the default 5 fps is insufficient for the motion estimator to perform accurately. 10 fps is the current recommendation. Higher frame rates will likely not be more performant and will only slow down Frigate and the motion estimator. Adjust your camera to output at least 10 frames per second and change the `fps` parameter in the [detect configuration](index.md) of your configuration file.

A fast [detector](object_detectors.md) is recommended. CPU detectors will not perform well or won't work at all. If Frigate already has trouble keeping track of your object, the autotracker will struggle as well.

The autotracker will add PTZ motion requests to a queue while the motor is moving. Once the motor stops, the events in the queue will be executed together as one large move (rather than incremental moves). If your PTZ's motor is slow, you may not be able to reliably autotrack fast moving objects.

## Usage applications

In security and surveillance, it's common to use "spotter" cameras in combination with your PTZ. When your fixed spotter camera detects an object, you could use an automation platform like Home Assistant to move the PTZ to a specific preset so that Frigate can begin automatically tracking the object. For example: a residence may have fixed cameras on the east and west side of the property, capturing views up and down a street. When the spotter camera on the west side detects a person, a Home Assistant automation could move the PTZ to a camera preset aimed toward the west. When the object enters the specified zone, Frigate's autotracker could then continue to track the person as it moves out of view of any of the fixed cameras.
