---
id: masks
title: Masks
---

There are two types of masks available:

**Motion masks**: Motion masks are used to prevent unwanted types of motion from triggering detection. Try watching the debug feed with `Motion Boxes` enabled to see what may be regularly detected as motion. For example, you want to mask out your timestamp, the sky, rooftops, etc. Keep in mind that this mask only prevents motion from being detected and does not prevent objects from being detected if object detection was started due to motion in unmasked areas. Motion is also used during object tracking to refine the object detection area in the next frame. Over masking will make it more difficult for objects to be tracked. To see this effect, create a mask, and then watch the video feed with `Motion Boxes` enabled again.

**Object filter masks**: Object filter masks are used to filter out false positives for a given object type based on location. These should be used to filter any areas where it is not possible for an object of that type to be. The bottom center of the detected object's bounding box is evaluated against the mask. If it is in a masked area, it is assumed to be a false positive. For example, you may want to mask out rooftops, walls, the sky, treetops for people. For cars, masking locations other than the street or your driveway will tell frigate that anything in your yard is a false positive.

To create a poly mask:

1. Visit the Web UI
1. Click the camera you wish to create a mask for
1. Select "Debug" at the top
1. Expand the "Options" below the video feed
1. Click "Mask & Zone creator"
1. Click "Add" on the type of mask or zone you would like to create
1. Click on the camera's latest image to create a masked area. The yaml representation will be updated in real-time
1. When you've finished creating your mask, click "Copy" and paste the contents into your config file and restart Frigate

Example of a finished row corresponding to the below example image:

```yaml
motion:
  mask: "0,461,3,0,1919,0,1919,843,1699,492,1344,458,1346,336,973,317,869,375,866,432"
```

Multiple masks can be listed.

```yaml
motion:
  mask:
    - 458,1346,336,973,317,869,375,866,432
    - 0,461,3,0,1919,0,1919,843,1699,492,1344
```

![poly](/img/example-mask-poly.png)
