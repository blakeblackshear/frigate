---
id: license_plate_recognition
title: License Plate Recognition (LPR)
---

Frigate can recognize license plates on vehicles and automatically add the detected characters as a `sub_label` to objects that are of type `car`. A common use case may be to read the license plates of cars pulling into a driveway or cars passing by on a street with a dedicated LPR camera.

Users running a Frigate+ model should ensure that `license_plate` is added to the [list of objects to track](https://docs.frigate.video/plus/#available-label-types) either globally or for a specific camera. This will improve the accuracy and performance of the LPR model.

LPR is most effective when the vehicle’s license plate is fully visible to the camera. For moving vehicles, Frigate will attempt to read the plate continuously, refining its detection and keeping the most confident result. LPR will not run on stationary vehicles.

## Minimum System Requirements

License plate recognition works by running AI models locally on your system. The models are relatively lightweight and run on your CPU. At least 4GB of RAM is required.

## Configuration

License plate recognition is disabled by default. Enable it in your config file:

```yaml
lpr:
  enabled: true
```

## Advanced Configuration

Several options are available to fine-tune the LPR feature. For example, you can adjust the `min_area` setting, which defines the minimum size in pixels a license plate must be before LPR runs. The default is 500 pixels.

Additionally, you can define `known_plates` as strings or regular expressions, allowing Frigate to label tracked vehicles with custom sub_labels when a recognized plate is detected. This information is then accessible in the UI, filters, and notifications.

```yaml
lpr:
  enabled: true
  min_area: 500
  known_plates:
    Wife's Car:
      - "ABC-1234"
      - "ABC-I234"
    Johnny:
      - "J*N-*234" # Using wildcards for H/M and 1/I
    Sally:
      - "[S5]LL-1234" # Matches SLL-1234 and 5LL-1234
```

In this example, "Wife's Car" will appear as the label for any vehicle matching the plate "ABC-1234." The model might occasionally interpret the digit 1 as a capital I (e.g., "ABC-I234"), so both variations are listed. Similarly, multiple possible variations are specified for Johnny and Sally.
