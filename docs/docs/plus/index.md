---
id: index
title: Models Guide
---

Frigate+ offers models trained from scratch and specifically designed for the way Frigate NVR analyzes video footage. These models offer higher accuracy with less resources. By uploading your own labeled examples, your model is tuned for accuracy in your specific conditions. After tuning, performance is evaluated against a broad dataset and real world examples submitted by other Frigate+ users to prevent overfitting.

With a subscription, and at each annual renewal, you will receive 12 model training credits that can be used to train tuned models. If you cancel your subscription, you will keep your existing credits and retain access to any trained models. Users with an active subscription can purchase additional training credits for $5 each.

Information on how to integrate Frigate+ with Frigate can be found in the [integrations docs](/integrations/plus).

## Frequently asked questions

### Are my models trained just on my image uploads? How are they built?

Frigate+ models are built by fine tuning a base model with the images you have annotated and verified. The base model is trained from scratch from a sampling of images across all Frigate+ user submissions and takes weeks of expensive GPU resources to train. If the models were built using your image uploads alone, you would need to provide tens of thousands of examples and it would take more than a week (and considerable cost) to train. Diversity helps the model generalize.

### What is a training credit and how do I use them?

Essentially, `1 training credit = 1 trained model`. When you have uploaded, annotated, and verified additional images and you are ready to train your model, you will submit a model request which will use one credit. The model that is trained will utilize all of the verified images in your account.

### Are my video feeds sent to the cloud for analysis when using Frigate+ models?

No. Frigate+ models are a drop in replacement for the default model. All processing is performed locally as always. The only images sent to Frigate+ are the ones you specifically submit via the `Send to Frigate+` button or upload directly.

### Can I label anything I want and train the model to recognize something custom for me?

Not currently. At the moment, the set of labels will be consistent for all users. The focus will be on expanding that set of labels before working on completely custom user labels.

### Can Frigate+ models be used offline?

Yes. Models and metadata are stored in the `model_cache` directory within the config folder. Frigate will only attempt to download a model if it does not exist in the cache. This means you can backup the directory and/or use it completely offline.

### Can I keep using my Frigate+ models even if I do not renew my subscription?

Yes. Subscriptions to Frigate+ provide access to the infrastructure used to train the models. Models trained using the training credits that you purchased are yours to keep and use forever. However, do note that the terms and conditions prohibit you from sharing, reselling, or creating derivative products from the models.

## Important model information

### Supported Model Types

Currently, Frigate+ models only support CPU (`cpu`) and Coral (`edgetpu`) models. OpenVino is next in line to gain support.

The models are created using the same MobileDet architecture as the default model. Additional architectures will be added in future releases as needed.

### Higher Scores

Frigate+ models generally have much higher scores than the default model provided in Frigate. You will likely need to increase your `threshold` and `min_score` values. Here is an example of how these values can be refined, but you should expect these to evolve as your model improves:

```yaml
objects:
  filters:
    dog:
      min_score: .7
      threshold: .9
    cat:
      min_score: .65
      threshold: .8
    face:
      min_score: .7
    package:
      min_score: .65
      threshold: .9
    license_plate:
      min_score: .6
    amazon:
      min_score: .75
    ups:
      min_score: .75
    fedex:
      min_score: .75
    person:
      min_score: .65
      threshold: .85
    car:
      min_score: .65
      threshold: .85
```

### Available label types

Frigate+ models support a more relevant set of objects for security cameras. Currently, only the following objects are supported: `person`, `face`, `car`, `license_plate`, `amazon`, `ups`, `fedex`, `package`, `dog`, `cat`, `deer`. Other object types available in the default Frigate model are not available. Additional object types will be added in future releases.

#### Label attributes

Frigate has special handling for some labels when using Frigate+ models. `face`, `license_plate`, `amazon`, `ups`, and `fedex` are considered attribute labels which are not tracked like regular objects and do not generate events. In addition, the `threshold` filter will have no effect on these labels. You should adjust the `min_score` and other filter values as needed.

In order to have Frigate start using these attribute labels, you will need to add them to the list of objects to track:

```yaml
objects:
  track:
    - person
    - face
    - license_plate
    - dog
    - cat
    - car
    - amazon
    - fedex
    - ups
    - package
```

When using Frigate+ models, Frigate will choose the snapshot of a person object that has the largest visible face. For cars, the snapshot with the largest visible license plate will be selected. This aids in secondary processing such as facial and license plate recognition for person and car objects.

![Face Attribute](/img/plus/attribute-example-face.jpg)

`amazon`, `ups`, and `fedex` labels are used to automatically assign a sub label to car objects.

![Fedex Attribute](/img/plus/attribute-example-fedex.jpg)

## Properly labeling images

For the best results, follow the following guidelines.

**Label every object in the image**: It is important that you label all objects in each image before verifying. If you don't label a car for example, the model will be taught that part of the image is _not_ a car and it will start to get confused.

**Make tight bounding boxes**: Tighter bounding boxes improve the recognition and ensure that accurate bounding boxes are predicted at runtime.

**Label the full object even when occluded**: If you have a person standing behind a car, label the full person even though a portion of their body may be hidden behind the car. This helps predict accurate bounding boxes and improves zone accuracy and filters at runtime.

**`amazon`, `ups`, and `fedex` should label the logo**: For a Fedex truck, label the truck as a `car` and make a different bounding box just for the Fedex logo. If there are multiple logos, label each of them.

![Fedex Logo](/img/plus/fedex-logo.jpg)

## Improving your model

You may find that Frigate+ models result in more false positives initially, but by submitting true and false positives, the model will improve. This may be because your cameras don't look quite enough like the user submissions that were used to train the base model. Over time, this will improve as more and more users (including you) submit examples to Frigate+.

False positives can be reduced by submitting **both** true positives and false positives. This will help the model differentiate between what is and isn't correct.

You may find that it's helpful to lower your thresholds a little in order to generate more false/true positives near the threshold value. For example, if you have some false positives that are scoring at 68% and some true positives scoring at 72%, you can try lowering your threshold to 65% and submitting both true and false positives within that range. This will help the model learn and widen the gap between true and false positive scores.

Note that only verified images will be used when training your model. Submitting an image from Frigate as a true or false positive will not verify the image. You still must verify the image in Frigate+ in order for it to be used in training.

In order to request your first model, you will need to have annotated and verified at least 10 images. Each subsequent model request will require that 10 additional images are verified. However, this is the bare minimum. For the best results, you should provide at least 100 verified images per camera. Keep in mind that varying conditions should be included. You will want images from cloudy days, sunny days, dawn, dusk, and night.

As circumstances change, you may need to submit new examples to address new types of false positives. For example, the change from summer days to snowy winter days or other changes such as a new grill or patio furniture may require additional examples and training.
