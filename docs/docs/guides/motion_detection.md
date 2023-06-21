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

In Home Assistant the `Improve Contrast`, `Contour Area`, and `Threshold` configuration entities are disabled by default but can easily be enabled and used.
