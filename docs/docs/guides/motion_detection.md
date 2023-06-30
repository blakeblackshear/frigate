---
id: motion_detection
title: Tuning Motion Detection
---

# Tuning Motion Detection

Frigate uses motion detection as a first line check to see if there is anything happening in the frame worth checking with object detection.

Once motion is detected, it tries to group up nearby areas of motion together in hopes of identifying a rectangle in the image that will capture the area worth inspecting. These are the red "motion boxes" you see in the debug viewer.

## The Goal

The default motion settings should work well for the majority of cameras, however there are cases where tuning motion detection can lead to better and more optimal results. Each camera has its own environment with different variables that affect motion, this means that the same motion settings will not fit all of your cameras.

Before tuning motion it is important to understand the goal. The optimal setup for motion detection would be that desired motion like people walking and cars driving but not detecting undesirable motion like grass moving, lighting changes, timestamps, etc.

## Masking Out Known Motion Causes

The first step would be to mask out causes of motion that are known to not be objects. This includes things like timestamps, tree limbs, larger bushes, etc. More details can be found [in the masks docs.](/configuration/masks.md).

## Prepare For Testing

The easiest way to tune motion detection is to do it live, have one window / screen open with the frigate debug view and motion boxes enabled with another window / screen open allowing for configuring the motion settings. It is recommended to use Home Assistant or MQTT as they offer live configuration of some motion settings meaning that Frigate does not need to be restarted when values are changed.

In Home Assistant the `Improve Contrast`, `Contour Area`, and `Threshold` configuration entities are disabled by default but can easily be enabled and used to tune live, otherwise MQTT can be used.

## Tuning Motion Detection During The Day

Now that things are setup, find a time to tune that represents normal circumstances. For example: If you tune your motion on a day that is sunny and windy you may find later that the motion settings are not sensitive enough on a cloudy and still day.

:::note

It is very unlikely to find motion detection settings that only detect desired motion and never detect undesired moition. Realistically, the goal is to find a balance that detects the desired motion without too much undesired motion being detected.

:::

### Threshold

The threshold value dictates how much of a change in a pixels luminance is required to be considered motion. 

Lower values mean motion detection is more sensitive to changes in color, making it more likely for exmaple to detect motion when a brown dogs blends in with a brown fence or a person wearing a red shirt blends in with a red car. If the threshold is too low however, it may detect things like grass blowing in the wind, shadows, etc. to be detected as motion.

Watching the motion boxes in the debug view, adjust the threshold until the undesired motion is not detected but be sure to also check with desired motion to ensure it is still detected.

### Contour Area

Once the threshold calculation is run, the pixels that have changed are grouped together. The contour area value is used to decide which groups of changed pixels qualify as motion. Smaller values are more sensitive meaning people that are far away, small animals, etc. are more likely to be detected as motion, but it also means that small changes in shadows, leaves, etc. are detected as motion. Higher values are less sensitive meaning these things won't be detected as motion but with the risk that desired motion won't be detected until closer to the camera.

Watching the motion boxes in the debug view, adjust the contour area until there are no motion boxes smaller than the smallest you'd expect frigate to detect something moving. 

### Improve Contrast

At this point if motion is working as desired there is no reason to continue with tuning for the day. If you were unable to find a balance between desired and undesired motion being detected, you can try disabling improve contrast and going back to the threshold and contour area steps.

## Tuning Motion Detection During The Night

Once daytime motion detection is tuned, there is a chance that the settings will work well for motion detection during the night as well. If this is the case then the preferred settings can be written to the config file and left alone. 

However, if the preferred day settings do not work well at night it is recommended to use HomeAssistant or some other solution to automate changing the settings. That way completely separate sets of motion settings can be used for optimal day and night motion detection.

## Tuning For Large Changes In Motion

Larges changes in motion like PTZ moves and camera switches between Color and IR mode should result in no motion detection. This is done via the `lightning_threshold` configuration. It is defined as the percentage of the image used to detect lightning or other substantial changes where motion detection needs to recalibrate. Increasing this value will make motion detection more likely to consider lightning or IR mode changes as valid motion. Decreasing this value will make motion detection more likely to ignore large amounts of motion such as a person approaching a doorbell camera.
