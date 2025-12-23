---
id: object_classification
title: Object Classification
---

Object classification allows you to train a custom MobileNetV2 classification model to run on tracked objects (persons, cars, animals, etc.) to identify a finer category or attribute for that object. Classification results are visible in the Tracked Object Details pane in Explore, through the `frigate/tracked_object_details` MQTT topic, in Home Assistant sensors via the official Frigate integration, or through the event endpoints in the HTTP API.

## Minimum System Requirements

Object classification models are lightweight and run very fast on CPU. Inference should be usable on virtually any machine that can run Frigate.

Training the model does briefly use a high amount of system resources for about 1–3 minutes per training run. On lower-power devices, training may take longer.

A CPU with AVX instructions is required for training and inference.

## Classes

Classes are the categories your model will learn to distinguish between. Each class represents a distinct visual category that the model will predict.

For object classification:

- Define classes that represent different types or attributes of the detected object
- Examples: For `person` objects, classes might be `delivery_person`, `resident`, `stranger`
- Include a `none` class for objects that don't fit any specific category
- Keep classes visually distinct to improve accuracy

### Classification Type

- **Sub label**:

  - Applied to the object’s `sub_label` field.
  - Ideal for a single, more specific identity or type.
  - Example: `cat` → `Leo`, `Charlie`, `None`.

- **Attribute**:
  - Added as metadata to the object, visible in the Tracked Object Details pane in Explore, `frigate/events` MQTT messages, and the HTTP API response as `<model_name>: <predicted_value>`.
  - Ideal when multiple attributes can coexist independently.
  - Example: Detecting if a `person` in a construction yard is wearing a helmet or not, and if they are wearing a yellow vest or not.

:::note

A tracked object can only have a single sub label. If you are using Triggers or Face Recognition and you configure an object classification model for `person` using the sub label type, your sub label may not be assigned correctly as it depends on which enrichment completes its analysis first. Consider using the `attribute` type instead.

:::

## Assignment Requirements

Sub labels and attributes are only assigned when both conditions are met:

1. **Threshold**: Each classification attempt must have a confidence score that meets or exceeds the configured `threshold` (default: `0.8`).
2. **Class Consensus**: After at least 3 classification attempts, 60% of attempts must agree on the same class label. If the consensus class is `none`, no assignment is made.

This two-step verification prevents false positives by requiring consistent predictions across multiple frames before assigning a sub label or attribute.

## Example use cases

### Sub label

- **Known pet vs unknown**: For `dog` objects, set sub label to your pet’s name (e.g., `buddy`) or `none` for others.
- **Mail truck vs normal car**: For `car`, classify as `mail_truck` vs `car` to filter important arrivals.
- **Delivery vs non-delivery person**: For `person`, classify `delivery` vs `visitor` based on uniform/props.

### Attributes

- **Backpack**: For `person`, add attribute `backpack: yes/no`.
- **Helmet**: For `person` (worksite), add `helmet: yes/no`.
- **Leash**: For `dog`, add `leash: yes/no` (useful for park or yard rules).
- **Ladder rack**: For `truck`, add `ladder_rack: yes/no` to flag service vehicles.

## Configuration

Object classification is configured as a custom classification model. Each model has its own name and settings. You must list which object labels should be classified.

```yaml
classification:
  custom:
    dog:
      threshold: 0.8
      object_config:
        objects: [dog] # object labels to classify
        classification_type: sub_label # or: attribute
```

An optional config, `save_attempts`, can be set as a key under the model name. This defines the number of classification attempts to save in the Recent Classifications tab. For object classification models, the default is 200.

## Training the model

Creating and training the model is done within the Frigate UI using the `Classification` page. The process consists of two steps:

### Step 1: Name and Define

Enter a name for your model, select the object label to classify (e.g., `person`, `dog`, `car`), choose the classification type (sub label or attribute), and define your classes. Frigate will automatically include a `none` class for objects that don't fit any specific category.

For example: To classify your two cats, create a model named "Our Cats" and create two classes, "Charlie" and "Leo". A third class, "none", will be created automatically for other neighborhood cats that are not your own.

### Step 2: Assign Training Examples

The system will automatically generate example images from detected objects matching your selected label. You'll be guided through each class one at a time to select which images represent that class. Any images not assigned to a specific class will automatically be assigned to `none` when you complete the last class. Once all images are processed, training will begin automatically.

When choosing which objects to classify, start with a small number of visually distinct classes and ensure your training samples match camera viewpoints and distances typical for those objects.

If examples for some of your classes do not appear in the grid, you can continue configuring the model without them. New images will begin to appear in the Recent Classifications view. When your missing classes are seen, classify them from this view and retrain your model.

### Improving the Model

- **Problem framing**: Keep classes visually distinct and relevant to the chosen object types.
- **Data collection**: Use the model’s Recent Classification tab to gather balanced examples across times of day, weather, and distances.
- **Preprocessing**: Ensure examples reflect object crops similar to Frigate’s boxes; keep the subject centered.
- **Labels**: Keep label names short and consistent; include a `none` class if you plan to ignore uncertain predictions for sub labels.
- **Threshold**: Tune `threshold` per model to reduce false assignments. Start at `0.8` and adjust based on validation.

## Debugging Classification Models

To troubleshoot issues with object classification models, enable debug logging to see detailed information about classification attempts, scores, and consensus calculations.

Enable debug logs for classification models by adding `frigate.data_processing.real_time.custom_classification: debug` to your `logger` configuration. These logs are verbose, so only keep this enabled when necessary. Restart Frigate after this change.

```yaml
logger:
  default: info
  logs:
    frigate.data_processing.real_time.custom_classification: debug
```

The debug logs will show:

- Classification probabilities for each attempt
- Whether scores meet the threshold requirement
- Consensus calculations and when assignments are made
- Object classification history and weighted scores
