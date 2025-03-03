---
id: index
title: Models
---

<a href="https://frigate.video/plus" target="_blank" rel="nofollow">Frigate+</a> offers models trained on images submitted by Frigate+ users from their security cameras and is specifically designed for the way Frigate NVR analyzes video footage. These models offer higher accuracy with less resources. The images you upload are used to fine tune a baseline model trained from images uploaded by all Frigate+ users. This fine tuning process results in a model that is optimized for accuracy in your specific conditions.

:::info

The baseline model isn't directly available after subscribing. This may change in the future, but for now you will need to submit a model request with the minimum number of images.

:::

With a subscription, 12 model trainings per year are included. If you cancel your subscription, you will retain access to any trained models. An active subscription is required to submit model requests or purchase additional trainings.

Information on how to integrate Frigate+ with Frigate can be found in the [integration docs](../integrations/plus.md).

## Available model types

There are two model types offered in Frigate+, `mobiledet` and `yolonas`. Both of these models are object detection models and are trained to detect the same set of labels [listed below](#available-label-types).

Not all model types are supported by all detectors, so it's important to choose a model type to match your detector as shown in the table under [supported detector types](#supported-detector-types).

| Model Type  | Description                                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `mobiledet` | Based on the same architecture as the default model included with Frigate. Runs on Google Coral devices and CPUs.                            |
| `yolonas`   | A newer architecture that offers slightly higher accuracy and improved detection of small objects. Runs on Intel, NVidia GPUs, and AMD GPUs. |

## Supported detector types

Currently, Frigate+ models support CPU (`cpu`), Google Coral (`edgetpu`), OpenVino (`openvino`), and ONNX (`onnx`) detectors.

:::warning

Using Frigate+ models with `onnx` is only available with Frigate 0.15 and later.

:::

| Hardware                                                                                                                     | Recommended Detector Type | Recommended Model Type |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ---------------------- |
| [CPU](/configuration/object_detectors.md#cpu-detector-not-recommended)                                                       | `cpu`                     | `mobiledet`            |
| [Coral (all form factors)](/configuration/object_detectors.md#edge-tpu-detector)                                             | `edgetpu`                 | `mobiledet`            |
| [Intel](/configuration/object_detectors.md#openvino-detector)                                                                | `openvino`                | `yolonas`              |
| [NVidia GPU](https://deploy-preview-13787--frigate-docs.netlify.app/configuration/object_detectors#onnx)\*                   | `onnx`                    | `yolonas`              |
| [AMD ROCm GPU](https://deploy-preview-13787--frigate-docs.netlify.app/configuration/object_detectors#amdrocm-gpu-detector)\* | `onnx`                    | `yolonas`              |

_\* Requires Frigate 0.15_

## Available label types

Frigate+ models support a more relevant set of objects for security cameras. Currently, the following objects are supported:

- **People**: `person`, `face`
- **Vehicles**: `car`, `motorcycle`, `bicycle`, `boat`, `license_plate`
- **Delivery Logos**: `amazon`, `usps`, `ups`, `fedex`, `dhl`, `an_post`, `purolator`, `postnl`, `nzpost`, `postnord`, `gls`, `dpd`
- **Animals**: `dog`, `cat`, `deer`, `horse`, `bird`, `raccoon`, `fox`, `bear`, `cow`, `squirrel`, `goat`, `rabbit`
- **Other**: `package`, `waste_bin`, `bbq_grill`, `robot_lawnmower`, `umbrella`

Other object types available in the default Frigate model are not available. Additional object types will be added in future releases.

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
