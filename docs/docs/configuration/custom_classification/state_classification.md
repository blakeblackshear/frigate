---
id: state_classification
title: State Classification
---

State classification allows you to train a custom MobileNetV2 classification model on a fixed region of your camera frame(s) to determine a current state. The model can be configured to run on a schedule and/or when motion is detected in that region.

## Minimum System Requirements

State classification models are lightweight and run very fast on CPU. Inference should be usable on virtually any machine that can run Frigate.

Training the model does briefly use a high amount of system resources for about 1–3 minutes per training run. On lower-power devices, training may take longer.

## Classes

Classes are the different states an area on your camera can be in. Each class represents a distinct visual state that the model will learn to recognize.

For state classification:

- Define classes that represent mutually exclusive states
- Examples: `open` and `closed` for a garage door, `on` and `off` for lights
- Use at least 2 classes (typically binary states work best)
- Keep class names clear and descriptive

## Example use cases

- **Door state**: Detect if a garage or front door is open vs closed.
- **Gate state**: Track if a driveway gate is open or closed.
- **Trash day**: Bins at curb vs no bins present.
- **Pool cover**: Cover on vs off.

## Configuration

State classification is configured as a custom classification model. Each model has its own name and settings. You must provide at least one camera crop under `state_config.cameras`.

```yaml
classification:
  custom:
    front_door:
      threshold: 0.8
      state_config:
        motion: true # run when motion overlaps the crop
        interval: 10 # also run every N seconds (optional)
        cameras:
          front:
            crop: [0, 180, 220, 400]
```

## Training the model

Creating and training the model is done within the Frigate UI using the `Classification` page.

### Getting Started

When choosing a portion of the camera frame for state classification, it is important to make the crop tight around the area of interest to avoid extra signals unrelated to what is being classified.

// TODO add this section once UI is implemented. Explain process of selecting a crop.

### Improving the Model

- **Problem framing**: Keep classes visually distinct and state-focused (e.g., `open`, `closed`, `unknown`). Avoid combining object identity with state in a single model unless necessary.
- **Data collection**: Use the model’s Recent Classifications tab to gather balanced examples across times of day and weather.
