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