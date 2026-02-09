---
id: face_recognition
title: Face Recognition
---

Face recognition identifies known individuals by matching detected faces with previously learned facial data. When a known `person` is recognized, their name will be added as a `sub_label`. This information is included in the UI, filters, as well as in notifications.

## Alerts and Notifications

Face recognition does not affect whether an alert is created — alerts are based on tracked objects like `person` in your `review.alerts.labels` and your [zone requirements](./review). The `face` label is an [attribute label](/plus/#available-label-types), not a tracked object, so it cannot trigger alerts on its own.

When a face is recognized, the person's name is added as a `sub_label` on the tracked object. This name appears in the Frigate UI, in [built-in notifications](/configuration/notifications), and is published via [MQTT](/integrations/mqtt).

:::note

There is no built-in way to only create alerts for specific recognized faces. Neither `face`, `person-verified`, nor specific person names can be used in `review.alerts.labels`. To trigger automations based on face recognition results, use the [official Frigate integration's sensors](/integrations/home-assistant) and/or the [MQTT data](/integrations/mqtt) Frigate publishes.

:::

## Model Requirements

### Face Detection

When running a Frigate+ model (or any custom model that natively detects faces) should ensure that `face` is added to the [list of objects to track](../plus/#available-label-types) either globally or for a specific camera. This will allow face detection to run at the same time as object detection and be more efficient.

When running a default COCO model or another model that does not include `face` as a detectable label, face detection will run via CV2 using a lightweight DNN model that runs on the CPU. In this case, you should _not_ define `face` in your list of objects to track.

:::note

Frigate needs to first detect a `person` before it can detect and recognize a face.

:::

### Face Recognition

Frigate has support for two face recognition model types:

- **small**: Frigate will run a FaceNet embedding model to recognize faces, which runs locally on the CPU. This model is optimized for efficiency and is not as accurate.
- **large**: Frigate will run a large ArcFace embedding model that is optimized for accuracy. It is only recommended to be run when an integrated or dedicated GPU / NPU is available.

In both cases, a lightweight face landmark detection model is also used to align faces before running recognition.

All of these features run locally on your system.

## Minimum System Requirements

The `small` model is optimized for efficiency and runs on the CPU, most CPUs should run the model efficiently.

The `large` model is optimized for accuracy, an integrated or discrete GPU / NPU is required. See the [Hardware Accelerated Enrichments](/configuration/hardware_acceleration_enrichments.md) documentation.

## Configuration

Face recognition is disabled by default, face recognition must be enabled in the UI or in your config file before it can be used. Face recognition is a global configuration setting.

```yaml
face_recognition:
  enabled: true
```

Like the other real-time processors in Frigate, face recognition runs on the camera stream defined by the `detect` role in your config. To ensure optimal performance, select a suitable resolution for this stream in your camera's firmware that fits your specific scene and requirements.

## Advanced Configuration

Fine-tune face recognition with these optional parameters at the global level of your config. The only optional parameters that can be set at the camera level are `enabled` and `min_area`.

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
- `min_faces`: Min face recognitions for the sub label to be applied to the person object.
  - Default: `1`
- `save_attempts`: Maximum number of face attempt images to keep in the training folder. Frigate saves a face image after each recognition attempt; when the limit is reached, the oldest image is deleted. These images are displayed in the Face Library's Recent Recognitions tab.
  - Default: `200`.
- `blur_confidence_filter`: Enables a filter that measures face image blurriness (using Laplacian variance) and reduces the recognition confidence score accordingly. Blurrier images receive a larger penalty (up to -0.06 for very blurry, down to 0 for clear images), making it harder for blurry faces to meet the `recognition_threshold`.
  - Default: `True`.
- `device`: Target a specific device to run the face recognition model on (multi-GPU installation).
  - Default: `None`.
  - Note: This setting is only applicable when using the `large` model. See [onnxruntime's provider options](https://onnxruntime.ai/docs/execution-providers/)

## Usage

Follow these steps to begin:

1. **Enable face recognition** in your configuration file and restart Frigate.
2. **Upload one face** using the **Add Face** button's wizard in the Face Library section of the Frigate UI. Read below for the best practices on expanding your training set.
3. When Frigate detects and attempts to recognize a face, it will appear in the **Train** tab of the Face Library, along with its associated recognition confidence.
4. From the **Train** tab, you can **assign the face** to a new or existing person to improve recognition accuracy for the future.

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

### Understanding the Recent Recognitions Tab

The Recent Recognitions tab in the face library displays recent face recognition attempts. Detected face images are grouped according to the person they were identified as potentially matching.

Each face image is labeled with a name (or `Unknown`) along with the confidence score of the recognition attempt. The score is color-coded based on your configured thresholds:

- **Green**: score >= `recognition_threshold` (default `0.9`) — a confident match
- **Orange**: score >= `unknown_score` (default `0.8`) — a potential match
- **Red**: score < `unknown_score` — unknown or no match

When an event has multiple recognition attempts, the face cards are displayed within a group. The group shows the recognized person's name if one was identified, or "Unknown" if not. Within the group, each individual face card shows its own recognition score. Frigate uses a weighted average across all attempts for a person object to determine whether to assign a name (`sub_label`) — so a single high-scoring card does not guarantee the person will be identified (see the [FAQ](#i-see-scores-above-the-threshold-in-the-recent-recognitions-tab-but-a-sub-label-wasnt-assigned) for more details).

If the weighted average did not meet the `recognition_threshold`, there is no place in the UI to see it. The weighted average is published in the `score` field of the [`frigate/tracked_object_update`](/integrations/mqtt.md#face-recognition-update) MQTT topic after each recognition attempt, regardless of whether it meets the threshold. This is the most useful tool for debugging why a sub label was or wasn't assigned.

Clicking a face card navigates to the Tracked Object Details for the associated event. To select face cards for deletion, right-click (or Ctrl/Cmd+click) individual cards, or use Ctrl+A to select all. A delete button will appear in the toolbar once cards are selected. Removing cards from the Recent Recognitions tab only removes the saved attempt images — it does not affect recognition accuracy or training data.

While each image can be used to train the system for a specific person, not all images are suitable for training. Refer to the guidelines below for best practices on selecting images for training.

### Step 1 - Building a Strong Foundation

When first enabling face recognition it is important to build a foundation of strong images. It is recommended to start by uploading 1-5 photos containing just this person's face. It is important that the person's face in the photo is front-facing and not turned, this will ensure a good starting point.

Then it is recommended to use the `Face Library` tab in Frigate to select and train images for each person as they are detected. When building a strong foundation it is strongly recommended to only train on images that are front-facing. Ignore images from cameras that recognize faces from an angle. Aim to strike a balance between the quality of images while also having a range of conditions (day / night, different weather conditions, different times of day, etc.) in order to have diversity in the images used for each person and not have over-fitting.

You do not want to train images that are 90%+ as these are already being confidently recognized. In this step the goal is to train on clear, lower scoring front-facing images until the majority of front-facing images for a given person are consistently recognized correctly. Then it is time to move on to step 2.

### Step 2 - Expanding The Dataset

Once front-facing images are performing well, start choosing slightly off-angle images to include for training. It is important to still choose images where enough face detail is visible to recognize someone, and you still only want to train on images that score lower.

## FAQ

### How do I debug Face Recognition issues?

Start with the [Usage](#usage) section and re-read the [Model Requirements](#model-requirements) above.

1. Ensure `person` is being _detected_. A `person` will automatically be scanned by Frigate for a face. Any detected faces will appear in the Recent Recognitions tab in the Frigate UI's Face Library.

   If you are using a Frigate+ or `face` detecting model:

   - Watch the debug view (Settings --> Debug) to ensure that `face` is being detected along with `person`.
   - You may need to adjust the `min_score` for the `face` object if faces are not being detected.

   If you are **not** using a Frigate+ or `face` detecting model:

   - Check your `detect` stream resolution and ensure it is sufficiently high enough to capture face details on `person` objects.
   - You may need to lower your `detection_threshold` if faces are not being detected.

2. Any detected faces will then be _recognized_.

   - Make sure you have trained at least one face per the recommendations above.
   - Adjust `recognition_threshold` settings per the suggestions [above](#advanced-configuration).

3. To see recognition scores for an event, check the **Face Library** > **Recent Recognitions** tab. Face cards from the same event are grouped together, with the group header showing the combined result. Each card within the group shows its individual recognition score with [color coding](#understanding-the-recent-recognitions-tab). The **Tracked Object Details** view only shows the final weighted average score (in parentheses next to the top score) if a `sub_label` was assigned.

### Detection does not work well with blurry images?

Accuracy is definitely a going to be improved with higher quality cameras / streams. It is important to look at the DORI (Detection Observation Recognition Identification) range of your camera, if that specification is posted. This specification explains the distance from the camera that a person can be detected, observed, recognized, and identified. The identification range is the most relevant here, and the distance listed by the camera is the furthest that face recognition will realistically work.

Some users have also noted that setting the stream in camera firmware to a constant bit rate (CBR) leads to better image clarity than with a variable bit rate (VBR).

### Why can't I bulk upload photos?

It is important to methodically add photos to the library, bulk importing photos (especially from a general photo library) will lead to over-fitting in that particular scenario and hurt recognition performance.

### Why can't I bulk reprocess faces?

Face embedding models work by breaking apart faces into different features. This means that when reprocessing an image, only images from a similar angle will have its score affected.

### Why do unknown people score similarly to known people?

This can happen for a few different reasons, but this is usually an indicator that the training set needs to be improved. This is often related to over-fitting:

- If you train with only a few images per person, especially if those images are very similar, the recognition model becomes overly specialized to those specific images.
- When you provide images with different poses, lighting, and expressions, the algorithm extracts features that are consistent across those variations.
- By training on a diverse set of images, the algorithm becomes less sensitive to minor variations and noise in the input image.

Review your face collections and remove most of the unclear or low-quality images. Then, use the **Reprocess** button on each face in the **Train** tab to evaluate how the changes affect recognition scores.

Avoid training on images that already score highly, as this can lead to over-fitting. Instead, focus on relatively clear images that score lower - ideally with different lighting, angles, and conditions—to help the model generalize more effectively.

### Frigate misidentified a face. Can I tell it that a face is "not" a specific person?

No, face recognition does not support negative training (i.e., explicitly telling it who someone is _not_). Instead, the best approach is to improve the training data by using a more diverse and representative set of images for each person.
For more guidance, refer to the section above on improving recognition accuracy.

### I see scores above the threshold in the Recent Recognitions tab, but a sub label wasn't assigned?

Frigate considers recognition scores across all attempts for each person object. The score shown in the UI is the final weighted average across all attempts, while MQTT publishes a running weighted average that updates after each attempt. The weighting favors larger faces (by pixel area, capped at 4000px) and higher-confidence detections. Attempts scored at or below `unknown_score` are excluded from the average.

A sub label will only be assigned if:

- At least `min_faces` recognition attempts have been recorded.
- A single person name has the most detections (no ties).
- The weighted average score meets the `recognition_threshold`.

This avoids cases where a single high-confidence recognition would throw off the results.

### Can I use other face recognition software like DoubleTake at the same time as the built in face recognition?

No, using another face recognition service will interfere with Frigate's built in face recognition. When using double-take the sub_label feature must be disabled if the built in face recognition is also desired.

### Does face recognition run on the recording stream?

Face recognition does not run on the recording stream, this would be suboptimal for many reasons:

1. The latency of accessing the recordings means the notifications would not include the names of recognized people because recognition would not complete until after.
2. The embedding models used run on a set image size, so larger images will be scaled down to match this anyway.
3. Motion clarity is much more important than extra pixels, over-compression and motion blur are much more detrimental to results than resolution.

### I get an unknown error when taking a photo directly with my iPhone

By default iOS devices will use HEIC (High Efficiency Image Container) for images, but this format is not supported for uploads. Choosing `large` as the format instead of `original` will use JPG which will work correctly.

### How can I delete the face database and start over?

Frigate does not store anything in its database related to face recognition. You can simply delete all of your faces through the Frigate UI or remove the contents of the `/media/frigate/clips/faces` directory.
