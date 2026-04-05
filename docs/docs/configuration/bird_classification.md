---
id: bird_classification
title: Bird Classification
---

import ConfigTabs from "@site/src/components/ConfigTabs";
import TabItem from "@theme/TabItem";
import NavPath from "@site/src/components/NavPath";

Bird classification identifies known birds using a quantized Tensorflow model. When a known bird is recognized, its common name will be added as a `sub_label`. This information is included in the UI, filters, as well as in notifications.

## Minimum System Requirements

Bird classification runs a lightweight tflite model on the CPU, there are no significantly different system requirements than running Frigate itself.

## Model

The classification model used is the MobileNet INat Bird Classification, [available identifiers can be found here.](https://raw.githubusercontent.com/google-coral/test_data/master/inat_bird_labels.txt)

## Configuration

Bird classification is disabled by default and must be enabled before it can be used. Bird classification is a global configuration setting.

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > Enrichments > Object classification" />.

- Set **Bird classification config > Bird classification** to on
- Set **Bird classification config > Minimum score** to the desired confidence score (default: 0.9)

</TabItem>
<TabItem value="yaml">

```yaml
classification:
  bird:
    enabled: true
```

</TabItem>
</ConfigTabs>

## Advanced Configuration

Fine-tune bird classification with these optional parameters:

- `threshold`: Classification confidence score required to set the sub label on the object.
  - Default: `0.9`.
