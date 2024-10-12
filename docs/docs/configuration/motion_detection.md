---
id: motion_detection
title: Motion Detection
---

# Tuning Motion Detection

Frigate uses motion detection as a first line check to see if there is anything happening in the frame worth checking with object detection.

Once motion is detected, it tries to group up nearby areas of motion together in hopes of identifying a rectangle in the image that will capture the area worth inspecting. These are the red "motion boxes" you see in the debug viewer.

## The Goal

The default motion settings should work well for the majority of cameras, however there are cases where tuning motion detection can lead to better and more optimal results. Each camera has its own environment with different variables that affect motion, this means that the same motion settings will not fit all of your cameras.

Before tuning motion it is important to understand the goal. In an optimal configuration, motion from people and cars would be detected, but not grass moving, lighting changes, timestamps, etc. If your motion detection is too sensitive, you will experience higher CPU loads and greater false positives from the increased rate of object detection. If it is not sensitive enough, you will miss objects that you want to track.

## Create Motion Masks

First, mask areas with regular motion not caused by the objects you want to detect. The best way to find candidates for motion masks is by watching the debug stream with motion boxes enabled. Good use cases for motion masks are timestamps or tree limbs and large bushes that regularly move due to wind. When possible, avoid creating motion masks that would block motion detection for objects you want to track **even if they are in locations where you don't want alerts or detections**. Motion masks should not be used to avoid detecting objects in specific areas. More details can be found [in the masks docs.](/configuration/masks.md).

## Prepare For Testing

The easiest way to tune motion detection is to use the Frigate UI under Settings > Motion Tuner. This screen allows the changing of motion detection values live to easily see the immediate effect on what is detected as motion.

## Tuning Motion Detection During The Day

Now that things are set up, find a time to tune that represents normal circumstances. For example, if you tune your motion on a day that is sunny and windy you may find later that the motion settings are not sensitive enough on a cloudy and still day.

:::note

Remember that motion detection is just used to determine when object detection should be used. You should aim to have motion detection sensitive enough that you won't miss objects you want to detect with object detection. The goal is to prevent object detection from running constantly for every small pixel change in the image. Windy days are still going to result in lots of motion being detected.

:::

### Threshold

The threshold value dictates how much of a change in a pixels luminance is required to be considered motion.

```yaml
# default threshold value
motion:
  # Optional: The threshold passed to cv2.threshold to determine if a pixel is different enough to be counted as motion. (default: shown below)
  # Increasing this value will make motion detection less sensitive and decreasing it will make motion detection more sensitive.
  # The value should be between 1 and 255.
  threshold: 30
```

Lower values mean motion detection is more sensitive to changes in color, making it more likely for example to detect motion when a brown dogs blends in with a brown fence or a person wearing a red shirt blends in with a red car. If the threshold is too low however, it may detect things like grass blowing in the wind, shadows, etc. to be detected as motion.

Watching the motion boxes in the debug view, increase the threshold until you only see motion that is visible to the eye. Once this is done, it is important to test and ensure that desired motion is still detected.

### Contour Area

```yaml
# default contour_area value
motion:
  # Optional: Minimum size in pixels in the resized motion image that counts as motion (default: shown below)
  # Increasing this value will prevent smaller areas of motion from being detected. Decreasing will
  # make motion detection more sensitive to smaller moving objects.
  # As a rule of thumb:
  #  - 10 - high sensitivity
  #  - 30 - medium sensitivity
  #  - 50 - low sensitivity
  contour_area: 10
```

Once the threshold calculation is run, the pixels that have changed are grouped together. The contour area value is used to decide which groups of changed pixels qualify as motion. Smaller values are more sensitive meaning people that are far away, small animals, etc. are more likely to be detected as motion, but it also means that small changes in shadows, leaves, etc. are detected as motion. Higher values are less sensitive meaning these things won't be detected as motion but with the risk that desired motion won't be detected until closer to the camera.

Watching the motion boxes in the debug view, adjust the contour area until there are no motion boxes smaller than the smallest you'd expect frigate to detect something moving.

### Improve Contrast

At this point if motion is working as desired there is no reason to continue with tuning for the day. If you were unable to find a balance between desired and undesired motion being detected, you can try disabling improve contrast and going back to the threshold and contour area steps.

## Tuning Motion Detection During The Night

Once daytime motion detection is tuned, there is a chance that the settings will work well for motion detection during the night as well. If this is the case then the preferred settings can be written to the config file and left alone.

However, if the preferred day settings do not work well at night it is recommended to use HomeAssistant or some other solution to automate changing the settings. That way completely separate sets of motion settings can be used for optimal day and night motion detection.

## Tuning For Large Changes In Motion

```yaml
# default lightning_threshold:
motion:
  # Optional: The percentage of the image used to detect lightning or other substantial changes where motion detection
  #           needs to recalibrate. (default: shown below)
  # Increasing this value will make motion detection more likely to consider lightning or ir mode changes as valid motion.
  # Decreasing this value will make motion detection more likely to ignore large amounts of motion such as a person approaching
  # a doorbell camera.
  lightning_threshold: 0.8
```

:::tip

Some cameras like doorbell cameras may have missed detections when someone walks directly in front of the camera and the lightning_threshold causes motion detection to be re-calibrated. In this case, it may be desirable to increase the `lightning_threshold` to ensure these objects are not missed.

:::

Large changes in motion like PTZ moves and camera switches between Color and IR mode should result in no motion detection. This is done via the `lightning_threshold` configuration. It is defined as the percentage of the image used to detect lightning or other substantial changes where motion detection needs to recalibrate. Increasing this value will make motion detection more likely to consider lightning or IR mode changes as valid motion. Decreasing this value will make motion detection more likely to ignore large amounts of motion such as a person approaching a doorbell camera.
