---
id: object_classification
title: Object Classification
---

Object classification allows you to train a custom MobileNetV2 classification model to run on tracked objects (persons, cars, animals, etc.) to identify a finer category or attribute for that object.

## Minimum System Requirements

Object classification models are lightweight and run very fast on CPU. Inference should be usable on virtually any machine that can run Frigate.

Training the model does briefly use a high amount of system resources for about 1–3 minutes per training run. On lower-power devices, training may take longer.
When running the `-tensorrt` image, Nvidia GPUs will automatically be used to accelerate training.

### Sub label vs Attribute

- **Sub label**:

  - Applied to the object’s `sub_label` field.
  - Ideal for a single, more specific identity or type.
  - Example: `cat` → `Leo`, `Charlie`, `None`.

- **Attribute**:
  - Added as metadata to the object (visible in /events): `<model_name>: <predicted_value>`.
  - Ideal when multiple attributes can coexist independently.
  - Example: Detecting if a `person` in a construction yard is wearing a helmet or not.

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
