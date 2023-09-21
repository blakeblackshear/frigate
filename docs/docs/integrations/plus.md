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

In Frigate, you can set the `PLUS_API_KEY` environment variable to enable the `SEND TO FRIGATE+` buttons on the events page. You can set it in your Docker Compose file or in your Docker run command. Home Assistant Addon users can set it under Settings > Addons > Frigate NVR > Configuration > Options (be sure to toggle the "Show unused optional configuration options" switch).

:::caution

You cannot use the `environment_vars` section of your configuration file to set this environment variable.

:::

## Submit examples

Once your API key is configured, you can submit examples directly from the events page in Frigate using the `SEND TO FRIGATE+` button.

:::note

Snapshots must be enabled to be able to submit examples to Frigate+

:::

![Send To Plus](/img/send-to-plus.png)

### Annotate and verify

You can view all of your submitted images at [https://plus.frigate.video](https://plus.frigate.video). Annotations can be added by clicking an image.

![Annotate](/img/annotate.png)

## Use Models

Models available in Frigate+ can be used with a special model path. No other information needs to be configured for Frigate+ models because it fetches the remaining config from Frigate+ automatically.

```yaml
model:
  path: plus://e63b7345cc83a84ed79dedfc99c16616
```

Models are downloaded into the `/config/model_cache` folder and only downloaded if needed.

You can override the labelmap for Frigate+ models like this:

```yaml
model:
  path: plus://e63b7345cc83a84ed79dedfc99c16616
  labelmap:
    3: animal
    4: animal
    5: animal
```
