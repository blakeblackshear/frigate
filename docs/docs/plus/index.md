---
id: index
title: Models
---

<a href="https://frigate.video/plus" target="_blank" rel="nofollow">Frigate+</a> offers models trained on images submitted by Frigate+ users from their security cameras and is specifically designed for the way Frigate NVR analyzes video footage. These models offer higher accuracy with less resources. The images you upload are used to fine tune a base model trained from images uploaded by all Frigate+ users. This fine tuning process results in a model that is optimized for accuracy in your specific conditions.

With a subscription, 12 model trainings to fine tune your model per year are included. In addition, you will have access to any base models published while your subscription is active. If you cancel your subscription, you will retain access to any trained and base models in your account. An active subscription is required to submit model requests or purchase additional trainings. New base models are published quarterly with target dates of January 15th, April 15th, July 15th, and October 15th.

Information on how to integrate Frigate+ with Frigate can be found in the [integration docs](../integrations/plus.md).

## Available model types

There are three model types offered in Frigate+, `mobiledet`, `yolonas`, and `yolov9`. All of these models are object detection models and are trained to detect the same set of labels [listed below](#available-label-types).

Not all model types are supported by all detectors, so it's important to choose a model type to match your detector as shown in the table under [supported detector types](#supported-detector-types). You can test model types for compatibility and speed on your hardware by using the base models.

| Model Type  | Description                                                                                                                                                    |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mobiledet` | Based on the same architecture as the default model included with Frigate. Runs on Google Coral devices and CPUs.                                              |
| `yolonas`   | A newer architecture that offers slightly higher accuracy and improved detection of small objects. Runs on Intel, NVidia GPUs, and AMD GPUs.                   |
| `yolov9`    | A leading SOTA (state of the art) object detection model with similar performance to yolonas, but on a wider range of hardware options. Runs on most hardware. |

### YOLOv9 Details

YOLOv9 models are available in `s`, `t`, `edgetpu` variants. When requesting a `yolov9` model, you will be prompted to choose a variant. If you want the model to be compatible with a Google Coral, you will need to choose the `edgetpu` variant. If you are unsure what variant to choose, you should perform some tests with the base models to find the performance level that suits you. The `s` size is most similar to the current `yolonas` models in terms of inference times and accuracy, and a good place to start is the `320x320` resolution model for `yolov9s`.

:::info

When switching to YOLOv9, you may need to adjust your thresholds for some objects.

:::

#### Hailo Support

If you have a Hailo device, you will need to specify the hardware you have when submitting a model request because they are not cross compatible. Please test using the available base models before submitting your model request.

#### Rockchip (RKNN) Support

Rockchip models are automatically converted as of 0.17. For 0.16, YOLOv9 onnx models will need to be manually converted. First, you will need to configure Frigate to use the model id for your YOLOv9 onnx model so it downloads the model to your `model_cache` directory. From there, you can follow the [documentation](/configuration/object_detectors.md#converting-your-own-onnx-model-to-rknn-format) to convert it.

## Supported detector types

Currently, Frigate+ models support CPU (`cpu`), Google Coral (`edgetpu`), OpenVino (`openvino`), ONNX (`onnx`), Hailo (`hailo8l`), and Rockchip (`rknn`) detectors.

| Hardware                                                                         | Recommended Detector Type | Recommended Model Type |
| -------------------------------------------------------------------------------- | ------------------------- | ---------------------- |
| [CPU](/configuration/object_detectors.md#cpu-detector-not-recommended)           | `cpu`                     | `mobiledet`            |
| [Coral (all form factors)](/configuration/object_detectors.md#edge-tpu-detector) | `edgetpu`                 | `yolov9`               |
| [Intel](/configuration/object_detectors.md#openvino-detector)                    | `openvino`                | `yolov9`               |
| [NVidia GPU](/configuration/object_detectors#onnx)                               | `onnx`                    | `yolov9`               |
| [AMD ROCm GPU](/configuration/object_detectors#amdrocm-gpu-detector)             | `onnx`                    | `yolov9`               |
| [Hailo8/Hailo8L/Hailo8R](/configuration/object_detectors#hailo-8)                | `hailo8l`                 | `yolov9`               |
| [Rockchip NPU](/configuration/object_detectors#rockchip-platform)                | `rknn`                    | `yolov9`               |

## Improving your model

Some users may find that Frigate+ models result in more false positives initially, but by submitting true and false positives, the model will improve. With all the new images now being submitted by subscribers, future base models will improve as more and more examples are incorporated. Note that only images with at least one verified label will be used when training your model. Submitting an image from Frigate as a true or false positive will not verify the image. You still must verify the image in Frigate+ in order for it to be used in training.

- **Submit both true positives and false positives**. This will help the model differentiate between what is and isn't correct. You should aim for a target of 80% true positive submissions and 20% false positives across all of your images. If you are experiencing false positives in a specific area, submitting true positives for any object type near that area in similar lighting conditions will help teach the model what that area looks like when no objects are present.
- **Lower your thresholds a little in order to generate more false/true positives near the threshold value**. For example, if you have some false positives that are scoring at 68% and some true positives scoring at 72%, you can try lowering your threshold to 65% and submitting both true and false positives within that range. This will help the model learn and widen the gap between true and false positive scores.
- **Submit diverse images**. For the best results, you should provide at least 100 verified images per camera. Keep in mind that varying conditions should be included. You will want images from cloudy days, sunny days, dawn, dusk, and night. As circumstances change, you may need to submit new examples to address new types of false positives. For example, the change from summer days to snowy winter days or other changes such as a new grill or patio furniture may require additional examples and training.

## Available label types

Frigate+ models support a more relevant set of objects for security cameras. The labels for annotation in Frigate+ are configurable by editing the camera in the Cameras section of Frigate+. Currently, the following objects are supported:

- **People**: `person`, `face`
- **Vehicles**: `car`, `motorcycle`, `bicycle`, `boat`, `school_bus`, `license_plate`
- **Delivery Logos**: `amazon`, `usps`, `ups`, `fedex`, `dhl`, `an_post`, `purolator`, `postnl`, `nzpost`, `postnord`, `gls`, `dpd`, `canada_post`, `royal_mail`
- **Animals**: `dog`, `cat`, `deer`, `horse`, `bird`, `raccoon`, `fox`, `bear`, `cow`, `squirrel`, `goat`, `rabbit`, `skunk`, `kangaroo`
- **Other**: `package`, `waste_bin`, `bbq_grill`, `robot_lawnmower`, `umbrella`

Other object types available in the default Frigate model are not available. Additional object types will be added in future releases.

### Candidate labels

Candidate labels are also available for annotation. These labels don't have enough data to be included in the model yet, but using them will help add support sooner. You can enable these labels by editing the camera settings.

Where possible, these labels are mapped to existing labels during training. For example, any `baby` labels are mapped to `person` until support for new labels is added.

The candidate labels are: `baby`, `bpost`, `badger`, `possum`, `rodent`, `chicken`, `groundhog`, `boar`, `hedgehog`, `tractor`, `golf cart`, `garbage truck`, `bus`, `sports ball`, `la_poste`, `lawnmower`, `heron`, `rickshaw`, `wombat`, `auspost`, `aramex`, `bobcat`, `mustelid`, `transoflex`, `airplane`, `drone`, `mountain_lion`, `crocodile`, `turkey`, `baby_stroller`, `monkey`, `coyote`, `porcupine`, `parcelforce`, `sheep`, `snake`, `helicopter`, `lizard`, `duck`, `hermes`, `cargus`, `fan_courier`, `sameday`

Candidate labels are not available for automatic suggestions.

### Label attributes

Frigate has special handling for some labels when using Frigate+ models. `face`, `license_plate`, and delivery logos such as `amazon`, `ups`, and `fedex` are considered attribute labels which are not tracked like regular objects and do not generate review items directly. In addition, the `threshold` filter will have no effect on these labels. You should adjust the `min_score` and other filter values as needed.

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

Delivery logos such as `amazon`, `ups`, and `fedex` labels are used to automatically assign a sub label to car objects.

![Fedex Attribute](/img/plus/attribute-example-fedex.jpg)
