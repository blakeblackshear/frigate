---
id: plus
title: Frigate+
---

:::info

Frigate+ is under active development and currently only offers the ability to submit your examples with annotations. Models will be available after enough examples are submitted to train a robust model. It is free to create an account and upload your examples.

:::

Frigate+ offers models trained from scratch and specifically designed for the way Frigate NVR analyzes video footage. They offer higher accuracy with less resources. By uploading your own labeled examples, your model can be uniquely tuned for accuracy in your specific conditions. After tuning, performance is evaluated against a broad dataset and real world examples submitted by other Frigate+ users to prevent overfitting.

Custom models also include a more relevant set of objects for security cameras such as person, face, car, license plate, delivery truck, package, dog, cat, deer, and more. Interested in detecting an object unique to you? Upload examples to incorporate your own objects without worrying that you are reducing the accuracy of other object types in the model.

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

### Submit examples

Once your API key is configured, you can submit examples directly from the events page in Frigate using the `SEND TO FRIGATE+` button.

:::note

Snapshots must be enabled to be able to submit examples to Frigate+

:::

![Send To Plus](/img/send-to-plus.png)

### Annotate and verify

You can view all of your submitted images at [https://plus.frigate.video](https://plus.frigate.video). Annotations can be added by clicking an image.

![Annotate](/img/annotate.png)
