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

- Diversity of the dataset: A dataset with diverse images, including variations in lighting, pose, and facial expressions, will require fewer images per person than a less diverse dataset.
- Desired accuracy: The higher the desired accuracy, the more images are typically needed.

However, here are some general guidelines:

- Minimum: For basic face recognition tasks, a minimum of 10-20 images per person is often recommended.
- Recommended: For more robust and accurate systems, 30-50 images per person is a good starting point.
- Ideal: For optimal performance, especially in challenging conditions, 100 or more images per person can be beneficial.

## Creating a Robust Training Set

The accuracy of face recognition is heavily dependent on the quality of data given to it for training. It is recommended to build the face training library in phases.

:::tip

When choosing images to include in the face training set it is recommended to always follow these recommendations:
- If it is difficult to make out details in a persons face it will not be helpful in training.
- Avoid images with under/over-exposure.
- Avoid blurry / pixelated images.
- Be careful when uploading images of people when they are wearing clothing that covers a lot of their face as this may confuse the training.
- Do not upload too many images at the same time, it is recommended to train 4-6 images for each person each day so it is easier to know if the previously added images helped or hurt performance.

:::

### Step 1 - Building a Strong Foundation

When first enabling face recognition it is important to build a foundation of strong images. It is recommended to start by uploading 1-2 photos taken by a smartphone for each person. It is important that the person's face in the photo is straight-on and not turned which will ensure a good starting point.

Then it is recommended to use the `Face Library` tab in Frigate to select and train images for each person as they are detected. When building a strong foundation it is strongly recommended to only train on images that are straight-on. Ignore images from cameras that recognize faces from an angle. Once a person starts to be consistently recognized correctly on images that are straight-on, it is time to move on to the next step.

### Step 2 - Expanding The Dataset

Once straight-on images are performing well, start choosing slightly off-angle images to include for training. It is important to still choose images where enough face detail is visible to recognize someone.