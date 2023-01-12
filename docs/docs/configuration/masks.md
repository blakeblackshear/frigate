---
id: masks
title: Masks
---

There are two types of masks available:

**Motion masks**: Motion masks are used to prevent unwanted types of motion from triggering detection. Try watching the debug feed with `Motion Boxes` enabled to see what may be regularly detected as motion. For example, you want to mask out your timestamp, the sky, rooftops, etc. Keep in mind that this mask only prevents motion from being detected and does not prevent objects from being detected if object detection was started due to motion in unmasked areas. Motion is also used during object tracking to refine the object detection area in the next frame. Over masking will make it more difficult for objects to be tracked. To see this effect, create a mask, and then watch the video feed with `Motion Boxes` enabled again.

**Object filter masks**: Object filter masks are used to filter out false positives for a given object type based on location. These should be used to filter any areas where it is not possible for an object of that type to be. The bottom center of the detected object's bounding box is evaluated against the mask. If it is in a masked area, it is assumed to be a false positive. For example, you may want to mask out rooftops, walls, the sky, treetops for people. For cars, masking locations other than the street or your driveway will tell Frigate that anything in your yard is a false positive.

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

![poly](/img/example-mask-poly-min.png)

### Further Clarification

This is a response to a [question posed on reddit](https://www.reddit.com/r/homeautomation/comments/ppxdve/replacing_my_doorbell_with_a_security_camera_a_6/hd876w4?utm_source=share&utm_medium=web2x&context=3):

It is helpful to understand a bit about how Frigate uses motion detection and object detection together.

First, Frigate uses motion detection as a first line check to see if there is anything happening in the frame worth checking with object detection.

Once motion is detected, it tries to group up nearby areas of motion together in hopes of identifying a rectangle in the image that will capture the area worth inspecting. These are the red "motion boxes" you see in the debug viewer.

After the area with motion is identified, Frigate creates a "region" (the green boxes in the debug viewer) to run object detection on. The models are trained on square images, so these regions are always squares. It adds a margin around the motion area in hopes of capturing a cropped view of the object moving that fills most of the image passed to object detection, but doesn't cut anything off. It also takes into consideration the location of the bounding box from the previous frame if it is tracking an object.

After object detection runs, if there are detected objects that seem to be cut off, Frigate reframes the region and runs object detection again on the same frame to get a better look.

All of this happens for each area of motion and tracked object.

> Are you simply saying that INITIAL triggering of any kind of detection will only happen in un-masked areas, but that once this triggering happens, the masks become irrelevant and object detection takes precedence?

Essentially, yes. I wouldn't describe it as object detection taking precedence though. The motion masks just prevent those areas from being counted as motion. Those masks do not modify the regions passed to object detection in any way, so you can absolutely detect objects in areas masked for motion.

> If so, this is completely expected and intuitive behavior for me. Because obviously if a "foot" starts motion detection the camera should be able to check if it's an entire person before it fully crosses into the zone. The docs imply this is the behavior, so I also don't understand why this would be detrimental to object detection on the whole.

When just a foot is triggering motion, Frigate will zoom in and look only at the foot. If that even qualifies as a person, it will determine the object is being cut off and look again and again until it zooms back out enough to find the whole person.

It is also detrimental to how Frigate tracks a moving object. Motion nearby the bounding box from the previous frame is used to intelligently determine where the region should be in the next frame. With too much masking, tracking is hampered and if an object walks from an unmasked area into a fully masked area, they essentially disappear and will be picked up as a "new" object if they leave the masked area. This is important because Frigate uses the history of scores while tracking an object to determine if it is a false positive or not. It takes a minimum of 3 frames for Frigate to determine is the object type it thinks it is, and the median score must be greater than the threshold. If a person meets this threshold while on the sidewalk before they walk into your stoop, you will get an alert the instant they step a single foot into a zone.

> I thought the main point of this feature was to cut down on CPU use when motion is happening in unnecessary areas.

It is, but the definition of "unnecessary" varies. I want to ignore areas of motion that I know are definitely not being triggered by objects of interest. Timestamps, trees, sky, rooftops. I don't want to ignore motion from objects that I want to track and know where they go.

> For me, giving my masks ANY padding results in a lot of people detection I'm not interested in. I live in the city and catch a lot of the sidewalk on my camera. People walk by my front door all the time and the margin between the sidewalk and actually walking onto my stoop is very thin, so I basically have everything but the exact contours of my stoop masked out. This results in very tidy detections but this info keeps throwing me off. Am I just overthinking it?

This is what `required_zones` are for. You should define a zone (remember this is evaluated based on the bottom center of the bounding box) and make it required to save snapshots and clips (now events in 0.9.0). You can also use this in your conditions for a notification.

> Maybe my specific situation just warrants this. I've just been having a hard time understanding the relevance of this information - it seems to be that it's exactly what would be expected when "masking out" an area of ANY image.

That may be the case for you. Frigate will definitely work harder tracking people on the sidewalk to make sure it doesn't miss anyone who steps foot on your stoop. The trade off with the way you have it now is slower recognition of objects and potential misses. That may be acceptable based on your needs. Also, if your resolution is low enough on the detect stream, your regions may already be so big that they grab the entire object anyway.
