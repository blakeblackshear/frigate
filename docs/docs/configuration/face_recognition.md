---
id: face_recognition
title: Face Recognition
---

Face recognition identifies known individuals by matching detected faces with previously learned facial data. When a known person is recognized, their name will be added as a `sub_label`. This information is included in the UI, filters, as well as in notifications.

## Model Requirements

### Face Detection

When running a Frigate+ model (or any custom model that natively detects faces) should ensure that `face` is added to the [list of objects to track](../plus/#available-label-types) either globally or for a specific camera. This will allow face detection to run at the same time as object detection and be more efficient.

When running a default COCO model or another model that does not include `face` as a detectable label, face detection will run via CV2 using a lightweight DNN model that runs on the CPU. In this case, you should _not_ define `face` in your list of objects to track.

### Face Recognition

Frigate has support for two face recognition model types:

- **small**: Frigate will run a FaceNet embedding model to recognize faces, which runs locally on the CPU. This model is optimized for efficiency and is not as accurate.
- **large**: Frigate will run a large ArcFace embedding model that is optimized for accuracy. It is only recommended to be run when an integrated or dedicated GPU is available.

In both cases, a lightweight face landmark detection model is also used to align faces before running recognition.

## Minimum System Requirements

The `small` model is optimized for efficiency and runs on the CPU, most CPUs should run the model efficiently.

The `large` model is optimized for accuracy, an integrated or discrete GPU is highly recommended.

## Configuration

Face recognition is disabled by default, face recognition must be enabled in the UI or in your config file before it can be used. Face recognition is a global configuration setting.

```yaml
face_recognition:
  enabled: true
```

## Advanced Configuration

Fine-tune face recognition with these optional parameters:

### Detection

- `detection_threshold`: Face detection confidence score required before recognition runs:
  - Default: `0.7`
  - Note: This is field only applies to the standalone face detection model, `min_score` should be used to filter for models that have face detection built in.
- `min_area`: Defines the minimum size (in pixels) a face must be before recognition runs.
  - Default: `500` pixels.
  - Depending on the resolution of your camera's `detect` stream, you can increase this value to ignore small or distant faces.

### Recognition

- `model_size`: Which model size to use, options are `small` or `large`
- `unknown_score`: Min score to mark a person as a potential match, matches at or below this will be marked as unknown.
  - Default: `0.8`.
- `recognition_threshold`: Recognition confidence score required to add the face to the object as a sub label.
  - Default: `0.9`.
- `save_attempts`: Number of images of recognized faces to save for training.
  - Default: `100`.
- `blur_confidence_filter`: Enables a filter that calculates how blurry the face is and adjusts the confidence based on this.
  - Default: `True`.

## Creating a Robust Training Set

The number of images needed for a sufficient training set for face recognition varies depending on several factors:

- Diversity of the dataset: A dataset with diverse images, including variations in lighting, pose, and facial expressions, will require fewer images per person than a less diverse dataset.
- Desired accuracy: The higher the desired accuracy, the more images are typically needed.

However, here are some general guidelines:

- Minimum: For basic face recognition tasks, a minimum of 5-10 images per person is often recommended.
- Recommended: For more robust and accurate systems, 20-30 images per person is a good starting point.
- Ideal: For optimal performance, especially in challenging conditions, 50-100 images per person can be beneficial.

The accuracy of face recognition is heavily dependent on the quality of data given to it for training. It is recommended to build the face training library in phases.

:::tip

When choosing images to include in the face training set it is recommended to always follow these recommendations:

- If it is difficult to make out details in a persons face it will not be helpful in training.
- Avoid images with extreme under/over-exposure.
- Avoid blurry / pixelated images.
- Avoid training on infrared (gray-scale). The models are trained on color images and will be able to extract features from gray-scale images.
- Using images of people wearing hats / sunglasses may confuse the model.
- Do not upload too many similar images at the same time, it is recommended to train no more than 4-6 similar images for each person to avoid over-fitting.

:::

### Step 1 - Building a Strong Foundation

When first enabling face recognition it is important to build a foundation of strong images. It is recommended to start by uploading 1-5 "portrait" photos for each person. It is important that the person's face in the photo is straight-on and not turned which will ensure a good starting point.

Then it is recommended to use the `Face Library` tab in Frigate to select and train images for each person as they are detected. When building a strong foundation it is strongly recommended to only train on images that are straight-on. Ignore images from cameras that recognize faces from an angle.

Aim to strike a balance between the quality of images while also having a range of conditions (day / night, different weather conditions, different times of day, etc.) in order to have diversity in the images used for each person and not have over-fitting.

Once a person starts to be consistently recognized correctly on images that are straight-on, it is time to move on to the next step.

### Step 2 - Expanding The Dataset

Once straight-on images are performing well, start choosing slightly off-angle images to include for training. It is important to still choose images where enough face detail is visible to recognize someone.

## FAQ

### Why can't I bulk upload photos?

It is important to methodically add photos to the library, bulk importing photos (especially from a general photo library) will lead to over-fitting in that particular scenario and hurt recognition performance.

### Why can't I bulk reprocess faces?

Face embedding models work by breaking apart faces into different features. This means that when reprocessing an image, only images from a similar angle will have its score affected.

### Why do unknown people score similarly to known people?

This can happen for a few different reasons, but this is usually an indicator that the training set needs to be improved. This is often related to over-fitting:

- If you train with only a few images per person, especially if those images are very similar, the recognition model becomes overly specialized to those specific images.
- When you provide images with different poses, lighting, and expressions, the algorithm extracts features that are consistent across those variations.
- By training on a diverse set of images, the algorithm becomes less sensitive to minor variations and noise in the input image.

### I see scores above the threshold in the train tab, but a sub label wasn't assigned?

The Frigate considers the recognition scores across all recognition attempts for each person object. The scores are continually weighted based on the area of the face, and a sub label will only be assigned to person if a person is confidently recognized consistently. This avoids cases where a single high confidence recognition would throw off the results.

### Can I use other face recognition software like DoubleTake at the same time as the built in face recognition?

No, using another face recognition service will interfere with Frigate's built in face recognition. When using double-take the sub_label feature must be disabled if the built in face recognition is also desired.

### Does face recognition run on the recording stream?

Face recognition does not run on the recording stream, this would be suboptimal for many reasons:
1. The latency of accessing the recordings means the notifications would not include the names of recognized people because recognition would not complete until after.
2. The embedding models used run on a set image size, so larger images will be scaled down to match this anyway.
3. Motion clarity is much more important than extra pixels, over-compression and motion blur are much more detrimental to results than resolution.

### I get an unknown error when taking a photo directly with my iPhone

By default iOS devices will use HEIC (High Efficiency Image Container) for images, but this format is not supported for uploads. Choosing `large` as the format instead of `original` will use JPG which will work correctly.
