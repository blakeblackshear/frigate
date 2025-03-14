---
id: license_plate_recognition
title: License Plate Recognition (LPR)
---

Frigate can recognize license plates on vehicles and automatically add the detected characters to the `recognized_license_plate` field or a known name as a `sub_label` to objects that are of type `car`. A common use case may be to read the license plates of cars pulling into a driveway or cars passing by on a street.

LPR works best when the license plate is clearly visible to the camera. For moving vehicles, Frigate continuously refines the recognition process, keeping the most confident result. However, LPR does not run on stationary vehicles.

When a plate is recognized, the recognized name is:

- Added to the `car` tracked object as a `sub_label` (if known) or the `recognized_license_plate` field (if unknown)
- Viewable in the Review Item Details pane in Review and the Tracked Object Details pane in Explore.
- Filterable through the More Filters menu in Explore.
- Published via the `frigate/events` MQTT topic as a `sub_label` (known) or `recognized_license_plate` (unknown) for the tracked object.

## Model Requirements

Users running a Frigate+ model (or any custom model that natively detects license plates) should ensure that `license_plate` is added to the [list of objects to track](https://docs.frigate.video/plus/#available-label-types) either globally or for a specific camera. This will improve the accuracy and performance of the LPR model.

Users without a model that detects license plates can still run LPR. Frigate uses a lightweight YOLOv9 license plate detection model that runs on your CPU. In this case, you should _not_ define `license_plate` in your list of objects to track.

:::note

Frigate needs to first detect a `car` before it can recognize a license plate. If you're using a dedicated LPR camera or have a zoomed-in view, make sure the camera captures enough of the `car` for Frigate to detect it reliably.

:::

## Minimum System Requirements

License plate recognition works by running AI models locally on your system. The models are relatively lightweight and run on your CPU. At least 4GB of RAM is required.

## Configuration

License plate recognition is disabled by default. Enable it in your config file:

```yaml
lpr:
  enabled: True
```

Ensure that your camera is configured to detect objects of type `car`, and that a car is actually being detected by Frigate. Otherwise, LPR will not run.

Like the other real-time processors in Frigate, license plate recognition runs on the camera stream defined by the `detect` role in your config. To ensure optimal performance, select a suitable resolution for this stream in your camera's firmware that fits your specific scene and requirements.

## Advanced Configuration

Fine-tune the LPR feature using these optional parameters:

### Detection

- **`detection_threshold`**: License plate object detection confidence score required before recognition runs.
  - Default: `0.7`
  - Note: This is field only applies to the standalone license plate detection model, `min_score` should be used to filter for models that have license plate detection built in.
- **`min_area`**: Defines the minimum size (in pixels) a license plate must be before recognition runs.
  - Default: `1000` pixels.
  - Depending on the resolution of your camera's `detect` stream, you can increase this value to ignore small or distant plates.

### Recognition

- **`recognition_threshold`**: Recognition confidence score required to add the plate to the object as a sub label.
  - Default: `0.9`.
- **`min_plate_length`**: Specifies the minimum number of characters a detected license plate must have to be added as a sub label to an object.
  - Use this to filter out short, incomplete, or incorrect detections.
- **`format`**: A regular expression defining the expected format of detected plates. Plates that do not match this format will be discarded.
  - `"^[A-Z]{1,3} [A-Z]{1,2} [0-9]{1,4}$"` matches plates like "B AB 1234" or "M X 7"
  - `"^[A-Z]{2}[0-9]{2} [A-Z]{3}$"` matches plates like "AB12 XYZ" or "XY68 ABC"
  - Websites like https://regex101.com/ can help test regular expressions for your plates.

### Matching

- **`known_plates`**: List of strings or regular expressions that assign custom a `sub_label` to `car` objects when a recognized plate matches a known value.
  - These labels appear in the UI, filters, and notifications.
  - Unknown plates are still saved but are added to the `recognized_license_plate` field rather than the `sub_label`.
- **`match_distance`**: Allows for minor variations (missing/incorrect characters) when matching a detected plate to a known plate.
  - For example, setting `match_distance: 1` allows a plate `ABCDE` to match `ABCBE` or `ABCD`.
  - This parameter will _not_ operate on known plates that are defined as regular expressions. You should define the full string of your plate in `known_plates` in order to use `match_distance`.

## Configuration Examples

```yaml
lpr:
  enabled: True
  min_area: 1500 # Ignore plates smaller than 1500 pixels
  min_plate_length: 4 # Only recognize plates with 4 or more characters
  known_plates:
    Wife's Car:
      - "ABC-1234"
      - "ABC-I234" # Accounts for potential confusion between the number one (1) and capital letter I
    Johnny:
      - "J*N-*234" # Matches JHN-1234 and JMN-I234, but also note that "*" matches any number of characters
    Sally:
      - "[S5]LL 1234" # Matches both SLL 1234 and 5LL 1234
    Work Trucks:
      - "EMP-[0-9]{3}[A-Z]" # Matches plates like EMP-123A, EMP-456Z
```

```yaml
lpr:
  enabled: True
  min_area: 4000 # Run recognition on larger plates only
  recognition_threshold: 0.85
  format: "^[A-Z]{2} [A-Z][0-9]{4}$" # Only recognize plates that are two letters, followed by a space, followed by a single letter and 4 numbers
  match_distance: 1 # Allow one character variation in plate matching
  known_plates:
    Delivery Van:
      - "RJ K5678"
      - "UP A1234"
    Supervisor:
      - "MN D3163"
```

## FAQ

### Why isn't my license plate being detected and recognized?

Ensure that:

- Your camera has a clear, human-readable, well-lit view of the plate. If you can't read the plate, Frigate certainly won't be able to. This may require changing video size, quality, or frame rate settings on your camera, depending on your scene and how fast the vehicles are traveling.
- The plate is large enough in the image (try adjusting `min_area`) or increasing the resolution of your camera's stream.
- A `car` is detected first, as LPR only runs on recognized vehicles.

If you are using a Frigate+ model or a custom model that detects license plates, ensure that `license_plate` is added to your list of objects to track.
If you are using the free model that ships with Frigate, you should _not_ add `license_plate` to the list of objects to track.

### Can I run LPR without detecting `car` objects?

No, Frigate requires a `car` to be detected first before recognizing a license plate.

### How can I improve detection accuracy?

- Use high-quality cameras with good resolution.
- Adjust `detection_threshold` and `recognition_threshold` values.
- Define a `format` regex to filter out invalid detections.

### Does LPR work at night?

Yes, but performance depends on camera quality, lighting, and infrared capabilities. Make sure your camera can capture clear images of plates at night.

### How can I match known plates with minor variations?

Use `match_distance` to allow small character mismatches. Alternatively, define multiple variations in `known_plates`.

### How do I debug LPR issues?

- View MQTT messages for `frigate/events` to verify detected plates.
- Adjust `detection_threshold` and `recognition_threshold` settings.
- If you are using a Frigate+ model or a model that detects license plates, watch the debug view (Settings --> Debug) to ensure that `license_plate` is being detected with a `car`.
- Enable debug logs for LPR by adding `frigate.data_processing.common.license_plate: debug` to your `logger` configuration. These logs are _very_ verbose, so only enable this when necessary.

### Will LPR slow down my system?

LPR runs on the CPU, so performance impact depends on your hardware. Ensure you have at least 4GB RAM and a capable CPU for optimal results.
