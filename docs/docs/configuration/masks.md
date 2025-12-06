---
id: masks
title: Masks
---

## Motion masks

Motion masks tell Frigate where motion should be ignored when deciding whether to run object detection or continue tracking an object.

### Identifying motion that should be masked

Before creating motion masks, review the camera’s **Debug feed**:

> Open **Settings → Debug**, then enable **Motion Boxes**.

This displays red motion boxes showing exactly which areas Frigate considers active.  
Watching this view over time helps you identify:

- Repeated nuisance motion (cars, shadows, tree movement)
- Areas that should be masked to reduce detector load
- Areas that must remain unmasked to preserve object tracking

Using the Debug feed is the recommended first step in determining the correct masking strategy.

### What motion masks do

- Motion detected inside a masked area is ignored when Frigate looks for activity worth analyzing.
- Motion in unmasked areas can start object detection and is used to update object tracking.
- The mask only affects the motion step. Once object detection is running, the detection region may still include parts of a masked area.

Typical places to use motion masks include:

- Timestamps or on-screen overlays  
- Sky and clouds  
- Rooftops  
- Tree tops or distant foliage  
- Roads or parking areas where you never care about motion  

### What motion masks do not do

- They do not prevent object detection within the masked region once detection has started.
- They do not determine when clips, snapshots, or notifications are generated. Use **zones** and `required_zones` for event control.

### Over-masking and tracking quality

Frigate tracks objects over multiple frames. Motion near the previous bounding box helps predict where the object will move next. If large regions are masked:

- Objects may disappear when they move into a masked area.
- When they re-enter an unmasked area, they may be treated as entirely new objects.
- Fewer frames are available to build a reliable classification, causing slower recognition or missed detections.

**Guideline:**  
Mask areas where interesting objects will never be (sky, rooftops, distant roads).  
Do not mask approach paths where you rely on accurate tracking (driveways, private sidewalks, yards, porches).

### Performance considerations

Motion and object detection both consume compute resources. Leaving busy regions unmasked (e.g., a main street with continuous traffic) can:

- Trigger motion constantly  
- Generate excessive detection regions  
- Increase inference latency or cause dropped frames on lower-powered hardware  

To reduce load:

1. Motion-mask busy areas that never contain relevant objects (streets, public sidewalks, distant parking lots).  
2. If needed, tune:
   - `detect.fps`
   - Detect-stream resolution
   - Detected object types (e.g., only `person`)

Avoid masking areas where tracking is needed. Use zones to limit when events are created instead of masking those paths.

### Zones vs motion masks

Use these tools together:

- **Motion masks** reduce unnecessary motion processing and improve performance.  
- **Zones** and **`required_zones`** control when events, clips, and notifications are generated.

A common pattern:  
Leave a private sidewalk unmasked so Frigate can track an approaching person, then require entry into a porch zone before creating an event.

---

## Object filter masks

Object filter masks tell Frigate where a detection of a specific object type should be discarded as a false positive. They operate on the final detection step rather than on motion.

How they work:

- After object detection, Frigate checks the **bottom center** of each bounding box.  
- If this point lies within the object filter mask for that object type, the detection is ignored.

Typical uses:

- **People:** mask rooftops, treetops, walls, skylines.  
- **Cars:** mask everywhere except the road or driveway.  
- **Hotspots:** mask a small area where a static feature is repeatedly misclassified.

Object filter masks are independent of motion masks: motion can still occur in these areas, but certain object detections will be filtered out.

Object filter masks can be used to filter out stubborn false positives in fixed locations. For example, the base of this tree may be frequently detected as a person. The image below shows an object filter mask (shaded red) over the location where the bottom center is typically located.

![object mask](/img/bottom-center-mask.jpg)

Keep object filter masks as **small and precise** as possible to avoid filtering valid detections.

---

## Using the mask creator

The mask and zone editor in the Web UI allows drawing polygons over a still frame from the camera.

To create a poly mask:

1. Visit the Web UI  
2. Open **Settings**  
3. Select **Mask / zone editor**  
4. Choose the camera you want to edit  
5. Click the **+** icon under the mask or zone type  
6. Click on the image to place polygon points; click the first point to close the shape  
7. Press **Save**  
8. Restart Frigate to apply your changes  

Frigate stores the resulting coordinates as normalized values:

```yaml
motion:
  mask: "0.000,0.427,0.002,0.000,0.999,0.000,0.999,0.781,0.885,0.456,0.700,0.424,0.701,0.311,0.507,0.294,0.453,0.347,0.451,0.400"
```

Multiple masks may be defined:

```yaml
motion:
  mask:
    - 0.239,1.246,0.175,0.901,0.165,0.805,0.195,0.802
    - 0.000,0.427,0.002,0.000,0.999,0.000,0.999,0.781,0.885,0.456
```

Object filter masks will appear under the corresponding object type and are created the same way in the editor.
