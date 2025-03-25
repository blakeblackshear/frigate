---
id: bird_classification
title: Bird Classification
---

Bird classification identifies known bird using a quantized inat bird tensorflow model. When a known bird is recognized, its common name will be added as a `sub_label`. This information is included in the UI, filters, as well as in notifications.

## Minimum System Requirements

Bird classification runs a lightweight tflite model on the CPU, there are no significantly different system requirements than running Frigate itself.

## Configuration

Bird classification is disabled by default, it must be enabled in your config file before it can be used. Bird classification is a global configuration setting.

```yaml
classification:
  bird:
    enabled: true
```

## Advanced Configuration

Fine-tune bird classification with these optional parameters:

- `threshold`: Classification confidence score required to set the sub label on the object.
  - Default: `0.9`.
