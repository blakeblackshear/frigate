---
id: index
title: Models
---

<a href="https://plus.frigate.video" target="_blank" rel="nofollow">Frigate+</a> offers models trained on images submitted by Frigate+ users from their security cameras and is specifically designed for the way Frigate NVR analyzes video footage. These models offer higher accuracy with less resources. The images you upload are used to fine tune a baseline model trained from images uploaded by all Frigate+ users. This fine tuning process results in a model that is optimized for accuracy in your specific conditions.

:::info

The baseline model isn't directly available after subscribing. This may change in the future, but for now you will need to submit a model request with the minimum number of images.

:::

With a subscription, 12 model trainings per year are included. If you cancel your subscription, you will retain access to any trained models. An active subscription is required to submit model requests or purchase additional trainings.

Information on how to integrate Frigate+ with Frigate can be found in the [integration docs](../integrations/plus.md).

## Supported detector types

:::warning

Frigate+ models are not supported for TensorRT or OpenVino yet.

:::

Currently, Frigate+ models only support CPU (`cpu`) and Coral (`edgetpu`) models. OpenVino is next in line to gain support.

The models are created using the same MobileDet architecture as the default model. Additional architectures will be added in future releases as needed.

## Available label types

Frigate+ models support a more relevant set of objects for security cameras. Currently, only the following objects are supported: `person`, `face`, `car`, `license_plate`, `amazon`, `ups`, `fedex`, `package`, `dog`, `cat`, `deer`. Other object types available in the default Frigate model are not available. Additional object types will be added in future releases.

### Label attributes

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
