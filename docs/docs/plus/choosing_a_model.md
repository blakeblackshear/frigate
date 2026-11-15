---
id: choosing_a_model
title: Choosing a model
---

Frigate+ offers several model types, sizes, and input resolutions. This page compares their accuracy and speed to help you decide which one to request. Make sure the model type you choose is supported by your detector, as shown in the [supported detector types](./index.md#supported-detector-types) table.

## Recommendations

- **YOLOv9-s at 320** is the balanced default if your hardware runs it well. It detects about twice as many objects as MobileDet, and 15 more per 100 than YOLO-NAS-s at 320, at the same false alarm rate.
- **Moving up a size at 320** helps more than moving to 640 for most cameras. YOLOv9-m at 320 detects more objects than YOLOv9-s at 640 (60% vs 59%) with lower GPU latency.
- **640 input** is rarely needed. Frigate doesn't run detection on the full frame. It crops a region around motion, at least 320 pixels wide for any model, and resizes it to the model's input size. Most regions are small, so a 640 model usually receives an upscaled crop and does worse than a 320 model given the same crop at its native size. 640 models detect small objects better only within a large region. See [object size and input resolution](#object-size-and-input-resolution) for details.
- **YOLOv9-c** gains little over YOLOv9-m: about 2 points of detection rate at 320 and none at 640, with more latency. On CPU it takes 1.4 to 1.7 times as long as YOLOv9-m.
- **YOLOv9-t at 640** is no better than YOLOv9-s at 320 (55% vs 54%) and is slower on both GPU and CPU.
- **YOLO-NAS-s** and **MobileDet** are only worth considering on hardware that can't run YOLOv9. Everywhere else, a YOLOv9 model of similar speed is more accurate.

Results on your own hardware and cameras will differ, so test with the base models before requesting a model.

### Thresholds

Each model's threshold for 95% precision is listed in the [accuracy](#accuracy) table. YOLOv9 models reach it at about 0.70 to 0.77. MobileDet (0.82) and YOLO-NAS-s (0.86 to 0.89) need higher thresholds, so with Frigate's default threshold they produce more false positives than the YOLOv9 models. See [object filters](../configuration/object_filters.md#object-scores) for how to adjust thresholds.

## How these were measured

The numbers on this page are for the 2026.3 base models.

- **Images:** 10,947 images from the Frigate+ validation set, from real Frigate cameras. Images that share a source with training images are excluded.
- **Processing:** every model runs through Frigate's own detector code and post-processing (Frigate 0.18.2), exactly as deployed.
- **Labels:** results cover the 12 most common labels: `car`, `person`, `waste_bin`, `license_plate`, `dog`, `cat`, `face`, `bicycle`, `bird`, `deer`, `bbq_grill`, and `package`.
- **Single frames:** each image is scored on its own. In Frigate, an object has to score well across several frames before it becomes a tracked object, so brief one-frame mistakes rarely reach you. Use these numbers to compare models with each other, not as event rates.

**Detection rate at 95% precision** is the main accuracy number. It's the share of real objects a model detects when its threshold is set so that 95% of its detections are correct (about 1 false detection in 20). Every model is held to the same false alarm rate, so the detection rates compare directly. The threshold that achieves this is shown too, because it differs between models.

## Accuracy

| Model      | Input | Detection rate at 95% precision | Missed objects per 100 | Threshold for 95% precision | AP50 |
| ---------- | ----- | ------------------------------- | ---------------------- | --------------------------- | ---- |
| MobileDet  | 320   | 24%                             | 76                     | 0.82                        | 0.47 |
| YOLO-NAS-s | 320   | 39%                             | 61                     | 0.86                        | 0.44 |
| YOLO-NAS-s | 640   | 48%                             | 52                     | 0.89                        | 0.55 |
| YOLOv9-t   | 320   | 45%                             | 55                     | 0.69                        | 0.44 |
| YOLOv9-t   | 640   | 55%                             | 45                     | 0.70                        | 0.54 |
| YOLOv9-s   | 320   | 54%                             | 46                     | 0.74                        | 0.54 |
| YOLOv9-s   | 640   | 59%                             | 41                     | 0.75                        | 0.61 |
| YOLOv9-m   | 320   | 60%                             | 40                     | 0.75                        | 0.58 |
| YOLOv9-m   | 640   | 64%                             | 36                     | 0.77                        | 0.64 |
| YOLOv9-c   | 320   | 62%                             | 38                     | 0.75                        | 0.60 |
| YOLOv9-c   | 640   | 63%                             | 37                     | 0.77                        | 0.64 |

AP50 is the standard COCO metric (IoU 0.5) averaged over the 12 labels. It summarizes accuracy across every threshold, while the detection rate describes one realistic setting.

:::note

These AP50 numbers can't be compared to the COCO results published for YOLOv9, YOLO-NAS, and other models. Those results are measured on the COCO dataset, while these are measured on images from security cameras, with a different set of labels (several, such as `license_plate`, `face`, and `package`, aren't in COCO) and through Frigate's own post-processing. Published COCO results also usually report mAP averaged over IoU 0.5 to 0.95 rather than AP50. Use these numbers only to compare Frigate+ models with each other.

:::

### By object size

AP50 by object size:

| Model      | Input | Small | Medium | Large |
| ---------- | ----- | ----- | ------ | ----- |
| MobileDet  | 320   | 0.23  | 0.62   | 0.71  |
| YOLO-NAS-s | 320   | 0.23  | 0.57   | 0.60  |
| YOLO-NAS-s | 640   | 0.42  | 0.63   | 0.58  |
| YOLOv9-t   | 320   | 0.22  | 0.60   | 0.67  |
| YOLOv9-t   | 640   | 0.42  | 0.63   | 0.57  |
| YOLOv9-s   | 320   | 0.35  | 0.70   | 0.73  |
| YOLOv9-s   | 640   | 0.51  | 0.69   | 0.69  |
| YOLOv9-m   | 320   | 0.40  | 0.73   | 0.74  |
| YOLOv9-m   | 640   | 0.54  | 0.71   | 0.72  |
| YOLOv9-c   | 320   | 0.44  | 0.73   | 0.77  |
| YOLOv9-c   | 640   | 0.54  | 0.71   | 0.74  |

In these single-image results, 640 input mostly helps small objects, such as distant people, license plates, and faces, and doesn't help medium and large objects. For example, license plate AP50 rises from 0.32 to 0.55 for YOLOv9-s. These numbers overstate the benefit of 640 in Frigate, as explained below.

#### Object size and input resolution

Frigate doesn't send the full camera frame to the model. It crops a region around motion or a tracked object, at least 320 pixels wide for any model, and resizes it to the model's input size. Most regions are small, so a 640 model usually receives a crop upscaled from 320 pixels, which adds no detail and performs worse than a 320 model given the same crop at its native size. A 640 model detects small objects better only when the region is large.

640 input can still help in scenes with large objects in the foreground and small objects in the background at the same time, such as a doorbell camera that sees a person on the porch and another person across the street. The region has to be large enough to fit the nearby person, so the distant person is small within it. Frigate already handles much of this case: when an object is small relative to the region it was detected in, Frigate runs a separate detection on a smaller region around it.

### By label

AP50 by label:

| Label           | MobileDet 320 | YOLO-NAS-s 320 | YOLOv9-t 320 | YOLOv9-s 320 | YOLOv9-m 320 | YOLOv9-c 320 | YOLO-NAS-s 640 | YOLOv9-t 640 | YOLOv9-s 640 | YOLOv9-m 640 | YOLOv9-c 640 |
| --------------- | ------------- | -------------- | ------------ | ------------ | ------------ | ------------ | -------------- | ------------ | ------------ | ------------ | ------------ |
| `car`           | 0.73          | 0.72           | 0.70         | 0.77         | 0.81         | 0.82         | 0.82           | 0.79         | 0.83         | 0.85         | 0.84         |
| `person`        | 0.65          | 0.62           | 0.62         | 0.72         | 0.75         | 0.76         | 0.71           | 0.69         | 0.76         | 0.78         | 0.77         |
| `waste_bin`     | 0.52          | 0.49           | 0.49         | 0.55         | 0.57         | 0.58         | 0.60           | 0.60         | 0.62         | 0.62         | 0.63         |
| `license_plate` | 0.31          | 0.31           | 0.23         | 0.32         | 0.36         | 0.39         | 0.55           | 0.46         | 0.55         | 0.60         | 0.61         |
| `dog`           | 0.38          | 0.35           | 0.39         | 0.53         | 0.53         | 0.57         | 0.40           | 0.48         | 0.53         | 0.55         | 0.58         |
| `cat`           | 0.41          | 0.37           | 0.39         | 0.51         | 0.57         | 0.59         | 0.43           | 0.46         | 0.58         | 0.61         | 0.62         |
| `face`          | 0.39          | 0.41           | 0.23         | 0.33         | 0.42         | 0.45         | 0.60           | 0.43         | 0.57         | 0.63         | 0.63         |
| `bicycle`       | 0.46          | 0.43           | 0.40         | 0.51         | 0.56         | 0.55         | 0.54           | 0.49         | 0.58         | 0.62         | 0.60         |
| `bird`          | 0.30          | 0.18           | 0.33         | 0.42         | 0.47         | 0.50         | 0.23           | 0.30         | 0.39         | 0.43         | 0.38         |
| `deer`          | 0.51          | 0.50           | 0.51         | 0.62         | 0.69         | 0.71         | 0.59           | 0.56         | 0.60         | 0.70         | 0.67         |
| `bbq_grill`     | 0.68          | 0.60           | 0.69         | 0.77         | 0.78         | 0.81         | 0.74           | 0.74         | 0.81         | 0.83         | 0.84         |
| `package`       | 0.35          | 0.28           | 0.34         | 0.46         | 0.47         | 0.49         | 0.39           | 0.43         | 0.50         | 0.48         | 0.50         |

## Speed

Average time per detection in milliseconds, measured through Frigate's detector code and including post-processing. Lower is better. A blank cell means that combination was not measured.

| Model      | Input | NVIDIA RTX 5060 Ti (ONNX, CUDA) | Intel i9-13900K (OpenVINO, CPU) | Intel i9-13900K (ONNX, CPU) | Intel i9-13900K (TFLite, CPU) |
| ---------- | ----- | ------------------------------- | ------------------------------- | --------------------------- | ----------------------------- |
| MobileDet  | 320   |                                 |                                 |                             | 8.4                           |
| YOLO-NAS-s | 320   | 4.9                             | 8.4                             | 8.9                         |                               |
| YOLO-NAS-s | 640   | 7.1                             | 29.6                            | 28.6                        |                               |
| YOLOv9-t   | 320   | 2.9                             | 4.3                             | 6.5                         |                               |
| YOLOv9-t   | 640   | 5.0                             | 12.9                            | 17.0                        |                               |
| YOLOv9-s   | 320   | 3.9                             | 9.3                             | 11.5                        |                               |
| YOLOv9-s   | 640   | 6.3                             | 33.1                            | 32.6                        |                               |
| YOLOv9-m   | 320   | 5.2                             | 23.2                            | 19.8                        |                               |
| YOLOv9-m   | 640   | 10.1                            | 88.1                            | 69.5                        |                               |
| YOLOv9-c   | 320   | 5.4                             | 38.8                            | 27.5                        |                               |
| YOLOv9-c   | 640   | 11.1                            | 147.8                           | 99.5                        |                               |

CPU times vary by about ±15% between runs. Speeds on other hardware, such as Google Coral, Hailo, Intel iGPUs and NPUs, AMD GPUs, and Rockchip NPUs, are not included here. Test the base models on your own hardware to compare speeds.
