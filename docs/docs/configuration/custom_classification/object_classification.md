---
id: object_classification
title: Object Classification
---

Object classification allows you to train a custom MobileNetV2 classification model to run on tracked objects (persons, cars, animals, etc.) to identify a finer category or attribute for that object.

## Minimum System Requirements

Object classification models are lightweight and run very fast on CPU. Inference should be usable on virtually any machine that can run Frigate.

Training the model does briefly use a high amount of system resources for about 1–3 minutes per training run. On lower-power devices, training may take longer.

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
  - Added as metadata to the object (visible in /events): `<model_name>: <predicted_value>`.
  - Ideal when multiple attributes can coexist independently.
  - Example: Detecting if a `person` in a construction yard is wearing a helmet or not.

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

## Training the model

Creating and training the model is done within the Frigate UI using the `Classification` page.

### Getting Started

When choosing which objects to classify, start with a small number of visually distinct classes and ensure your training samples match camera viewpoints and distances typical for those objects.

// TODO add this section once UI is implemented. Explain process of selecting objects and curating training examples.

### Improving the Model

- **Problem framing**: Keep classes visually distinct and relevant to the chosen object types.
- **Data collection**: Use the model’s Recent Classification tab to gather balanced examples across times of day, weather, and distances.
- **Preprocessing**: Ensure examples reflect object crops similar to Frigate’s boxes; keep the subject centered.
- **Labels**: Keep label names short and consistent; include a `none` class if you plan to ignore uncertain predictions for sub labels.
- **Threshold**: Tune `threshold` per model to reduce false assignments. Start at `0.8` and adjust based on validation.
