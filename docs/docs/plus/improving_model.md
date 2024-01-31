---
id: improving_model
title: Improving your model
---

You may find that Frigate+ models result in more false positives initially, but by submitting true and false positives, the model will improve. Because a limited number of users submitted images to Frigate+ prior to this launch, you may need to submit several hundred images per camera to see good results. With all the new images now being submitted, future base models will improve as more and more users (including you) submit examples to Frigate+. Note that only verified images will be used when training your model. Submitting an image from Frigate as a true or false positive will not verify the image. You still must verify the image in Frigate+ in order for it to be used in training.

- **Submit both true positives and false positives**. This will help the model differentiate between what is and isn't correct. You should aim for a target of 80% true positive submissions and 20% false positives across all of your images. If you are experiencing false positives in a specific area, submitting true positives for any object type near that area in similar lighting conditions will help teach the model what that area looks like when no objects are present.
- **Lower your thresholds a little in order to generate more false/true positives near the threshold value**. For example, if you have some false positives that are scoring at 68% and some true positives scoring at 72%, you can try lowering your threshold to 65% and submitting both true and false positives within that range. This will help the model learn and widen the gap between true and false positive scores.
- **Submit diverse images**. For the best results, you should provide at least 100 verified images per camera. Keep in mind that varying conditions should be included. You will want images from cloudy days, sunny days, dawn, dusk, and night. As circumstances change, you may need to submit new examples to address new types of false positives. For example, the change from summer days to snowy winter days or other changes such as a new grill or patio furniture may require additional examples and training.

## Properly labeling images

For the best results, follow the following guidelines.

**Label every object in the image**: It is important that you label all objects in each image before verifying. If you don't label a car for example, the model will be taught that part of the image is _not_ a car and it will start to get confused.

**Make tight bounding boxes**: Tighter bounding boxes improve the recognition and ensure that accurate bounding boxes are predicted at runtime.

**Label the full object even when occluded**: If you have a person standing behind a car, label the full person even though a portion of their body may be hidden behind the car. This helps predict accurate bounding boxes and improves zone accuracy and filters at runtime.

**`amazon`, `ups`, and `fedex` should label the logo**: For a Fedex truck, label the truck as a `car` and make a different bounding box just for the Fedex logo. If there are multiple logos, label each of them.

![Fedex Logo](/img/plus/fedex-logo.jpg)

## False positive labels

False positives will be shown with a read box and the label will have a strike through.
![false positive](/img/plus/false-positive.jpg)

Misidentified objects should have a correct label added. For example, if a person was mistakenly detected as a cat, you should submit it as a false positive in Frigate and add a label for the person. The boxes will overlap.

![add image](/img/plus/false-positive-overlap.jpg)
