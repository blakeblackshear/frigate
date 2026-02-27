---
id: plus
title: Frigate+
---

For more information about how to use Frigate+ to improve your model, see the [Frigate+ docs](/plus/).

## Setup

### Create an account

Free accounts can be created at [https://plus.frigate.video](https://plus.frigate.video).

### Generate an API key

Once logged in, you can generate an API key for Frigate in Settings.

![API key](/img/plus-api-key-min.png)

### Set your API key

In Frigate, you can use an environment variable or a docker secret named `PLUS_API_KEY` to enable the `Frigate+` buttons on the Explore page. Home Assistant Addon users can set it under Settings > Add-ons > Frigate > Configuration > Options (be sure to toggle the "Show unused optional configuration options" switch).

:::warning

You cannot use the `environment_vars` section of your Frigate configuration file to set this environment variable. It must be defined as an environment variable in the docker config or Home Assistant Add-on config.

:::

## Submit examples

Once your API key is configured, you can submit examples directly from the Explore page in Frigate. From the More Filters menu, select "Has a Snapshot - Yes" and "Submitted to Frigate+ - No", and press Apply at the bottom of the pane. Then, click on a thumbnail and select the Snapshot tab.

You can use your keyboard's left and right arrow keys to quickly navigate between the tracked object snapshots.

:::note

Snapshots must be enabled to be able to submit examples to Frigate+

:::

![Submit To Plus](/img/plus/submit-to-plus.jpg)

### Annotate and verify

You can view all of your submitted images at [https://plus.frigate.video](https://plus.frigate.video). Annotations can be added by clicking an image. For more detailed information about labeling, see the documentation on [annotating](../plus/annotating.md).

![Annotate](/img/annotate.png)

## Use Models

Once you have [requested your first model](../plus/first_model.md) and gotten your own model ID, it can be used with a special model path. No other information needs to be configured for Frigate+ models because it fetches the remaining config from Frigate+ automatically.

You can either choose the new model from the Frigate+ pane in the Settings page of the Frigate UI, or manually set the model at the root level in your config:

```yaml
detectors: ...

model:
  path: plus://<your_model_id>
```

:::note

Model IDs are not secret values and can be shared freely. Access to your model is protected by your API key.

:::

Models are downloaded into the `/config/model_cache` folder and only downloaded if needed.

If needed, you can override the labelmap for Frigate+ models. This is not recommended as renaming labels will break the Submit to Frigate+ feature if the labels are not available in Frigate+.

```yaml
model:
  path: plus://<your_model_id>
  labelmap:
    3: animal
    4: animal
    5: animal
```
