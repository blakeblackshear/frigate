---
id: face_recognition
title: Face Recognition
---

Face recognition allows people to be assigned names and when their face is recognized Frigate will assign the person's name as a sub label. This information is included in the UI, filters, as well as in notifications.

Frigate has support for FaceNet to create face embeddings, which runs locally. Embeddings are then saved to Frigate's database.

## Minimum System Requirements

Face recognition works by running a large AI model locally on your system. Systems without a GPU will not run Face Recognition reliably or at all.

## Configuration

Face recognition is disabled by default and requires semantic search to be enabled, face recognition must be enabled in your config file before it can be used. Semantic Search and face recognition are global configuration settings.

```yaml
face_recognition:
  enabled: true
```

## Dataset

The number of images needed for a sufficient training set for face recognition varies depending on several factors:

- Complexity of the task: A simple task like recognizing faces of known individuals may require fewer images than a complex task like identifying unknown individuals in a large crowd.
- Diversity of the dataset: A dataset with diverse images, including variations in lighting, pose, and facial expressions, will require fewer images per person than a less diverse dataset.
- Desired accuracy: The higher the desired accuracy, the more images are typically needed.

However, here are some general guidelines:

- Minimum: For basic face recognition tasks, a minimum of 10-20 images per person is often recommended.
- Recommended: For more robust and accurate systems, 30-50 images per person is a good starting point.
- Ideal: For optimal performance, especially in challenging conditions, 100 or more images per person can be beneficial.