---
id: first_model
title: Requesting your first model
---

## Step 1: Upload and annotate your images

Before requesting your first model, you will need to upload and verify at least 10 images to Frigate+. The more images you upload, annotate, and verify the better your results will be. Most users start to see very good results once they have at least 100 verified images per camera. Keep in mind that varying conditions should be included. You will want images from cloudy days, sunny days, dawn, dusk, and night. Refer to the [integration docs](../integrations/plus.md#generate-an-api-key) for instructions on how to easily submit images to Frigate+ directly from Frigate.

It is recommended to submit **both** true positives and false positives. This will help the model differentiate between what is and isn't correct. You should aim for a target of 80% true positive submissions and 20% false positives across all of your images. If you are experiencing false positives in a specific area, submitting true positives for any object type near that area in similar lighting conditions will help teach the model what that area looks like when no objects are present.

For more detailed recommendations, you can refer to the docs on [annotating](./annotating.md).

## Step 2: Submit a model request

Once you have an initial set of verified images, you can request a model on the Models page. For guidance on choosing a model type, refer to [this part of the documentation](./index.md#available-model-types). If you are unsure which type to request, you can test the base model for each version from the "Base Models" tab. Each model request requires 1 of the 12 trainings that you receive with your annual subscription. This model will support all [label types available](./index.md#available-label-types) even if you do not submit any examples for those labels. Model creation can take up to 36 hours.
![Plus Models Page](/img/plus/plus-models.jpg)

## Step 3: Set your model id in the config

You will receive an email notification when your Frigate+ model is ready.
![Model Ready Email](/img/plus/model-ready-email.jpg)

Models available in Frigate+ can be used with a special model path. No other information needs to be configured because it fetches the remaining config from Frigate+ automatically.

```yaml
detectors: ...

model:
  path: plus://<your_model_id>
```

:::note

Model IDs are not secret values and can be shared freely. Access to your model is protected by your API key.

:::

:::tip

When setting the plus model id, all other fields should be removed as these are configured automatically with the Frigate+ model config

:::

## Step 4: Adjust your object filters for higher scores

Frigate+ models generally have much higher scores than the default model provided in Frigate. You will likely need to increase your `threshold` and `min_score` values. Here is an example of how these values can be refined, but you should expect these to evolve as your model improves. For more information about how `threshold` and `min_score` are related, see the docs on [object filters](../configuration/object_filters.md#object-scores).

```yaml
objects:
  filters:
    dog:
      min_score: .7
      threshold: .9
    cat:
      min_score: .65
      threshold: .8
    face:
      min_score: .7
    package:
      min_score: .65
      threshold: .9
    license_plate:
      min_score: .6
    amazon:
      min_score: .75
    ups:
      min_score: .75
    fedex:
      min_score: .75
    person:
      min_score: .65
      threshold: .85
    car:
      min_score: .65
      threshold: .85
```
