---
id: semantic_search
title: Semantic Search
---

Semantic Search in Frigate allows you to find tracked objects within your review items using either the image itself, a user-defined text description, or an automatically generated one. This feature works by creating _embeddings_ — numerical vector representations — for both the images and text descriptions of your tracked objects. By comparing these embeddings, Frigate assesses their similarities to deliver relevant search results.

Frigate uses models from [Jina AI](https://huggingface.co/jinaai) to create and save embeddings to Frigate's database. All of this runs locally.

Semantic Search is accessed via the _Explore_ view in the Frigate UI.

## Minimum System Requirements

Semantic Search works by running a large AI model locally on your system. Small or underpowered systems like a Raspberry Pi will not run Semantic Search reliably or at all.

A minimum of 8GB of RAM is required to use Semantic Search. A GPU is not strictly required but will provide a significant performance increase over CPU-only systems.

For best performance, 16GB or more of RAM and a dedicated GPU are recommended.

## Configuration

Semantic Search is disabled by default, and must be enabled in your config file or in the UI's Enrichments Settings page before it can be used. Semantic Search is a global configuration setting.

```yaml
semantic_search:
  enabled: True
  reindex: False
```

:::tip

The embeddings database can be re-indexed from the existing tracked objects in your database by pressing the "Reindex" button in the Enrichments Settings in the UI or by adding `reindex: True` to your `semantic_search` configuration and restarting Frigate. Depending on the number of tracked objects you have, it can take a long while to complete and may max out your CPU while indexing.

If you are enabling Semantic Search for the first time, be advised that Frigate does not automatically index older tracked objects. You will need to reindex as described above.

:::

### Jina AI CLIP (version 1)

The [V1 model from Jina](https://huggingface.co/jinaai/jina-clip-v1) has a vision model which is able to embed both images and text into the same vector space, which allows `image -> image` and `text -> image` similarity searches. Frigate uses this model on tracked objects to encode the thumbnail image and store it in the database. When searching for tracked objects via text in the search box, Frigate will perform a `text -> image` similarity search against this embedding. When clicking "Find Similar" in the tracked object detail pane, Frigate will perform an `image -> image` similarity search to retrieve the closest matching thumbnails.

The V1 text model is used to embed tracked object descriptions and perform searches against them. Descriptions can be created, viewed, and modified on the Explore page when clicking on thumbnail of a tracked object. See [the object description docs](/configuration/genai/objects.md) for more information on how to automatically generate tracked object descriptions.

Differently weighted versions of the Jina models are available and can be selected by setting the `model_size` config option as `small` or `large`:

```yaml
semantic_search:
  enabled: True
  model: "jinav1"
  model_size: small
```

- Configuring the `large` model employs the full Jina model and will automatically run on the GPU if applicable.
- Configuring the `small` model employs a quantized version of the Jina model that uses less RAM and runs on CPU with a very negligible difference in embedding quality.

### Jina AI CLIP (version 2)

Frigate also supports the [V2 model from Jina](https://huggingface.co/jinaai/jina-clip-v2), which introduces multilingual support (89 languages). In contrast, the V1 model only supports English.

V2 offers only a 3% performance improvement over V1 in both text-image and text-text retrieval tasks, an upgrade that is unlikely to yield noticeable real-world benefits. Additionally, V2 has _significantly_ higher RAM and GPU requirements, leading to increased inference time and memory usage. If you plan to use V2, ensure your system has ample RAM and a discrete GPU. CPU inference (with the `small` model) using V2 is not recommended.

To use the V2 model, update the `model` parameter in your config:

```yaml
semantic_search:
  enabled: True
  model: "jinav2"
  model_size: large
```

For most users, especially native English speakers, the V1 model remains the recommended choice.

:::note

Switching between V1 and V2 requires reindexing your embeddings. The embeddings from V1 and V2 are incompatible, and failing to reindex will result in incorrect search results.

:::

### GPU Acceleration

The CLIP models are downloaded in ONNX format, and the `large` model can be accelerated using GPU hardware, when available. This depends on the Docker build that is used. You can also target a specific device in a multi-GPU installation.

```yaml
semantic_search:
  enabled: True
  model_size: large
  # Optional, if using the 'large' model in a multi-GPU installation
  device: 0
```

:::info

If the correct build is used for your GPU / NPU and the `large` model is configured, then the GPU will be detected and used automatically.
Specify the `device` option to target a specific GPU in a multi-GPU system (see [onnxruntime's provider options](https://onnxruntime.ai/docs/execution-providers/)).
If you do not specify a device, the first available GPU will be used.

See the [Hardware Accelerated Enrichments](/configuration/hardware_acceleration_enrichments.md) documentation.

:::

## Usage and Best Practices

1. Semantic Search is used in conjunction with the other filters available on the Explore page. Use a combination of traditional filtering and Semantic Search for the best results.
2. Use the thumbnail search type when searching for particular objects in the scene. Use the description search type when attempting to discern the intent of your object.
3. Because of how the AI models Frigate uses have been trained, the comparison between text and image embedding distances generally means that with multi-modal (`thumbnail` and `description`) searches, results matching `description` will appear first, even if a `thumbnail` embedding may be a better match. Play with the "Search Type" setting to help find what you are looking for. Note that if you are generating descriptions for specific objects or zones only, this may cause search results to prioritize the objects with descriptions even if the the ones without them are more relevant.
4. Make your search language and tone closely match exactly what you're looking for. If you are using thumbnail search, **phrase your query as an image caption**. Searching for "red car" may not work as well as "red sedan driving down a residential street on a sunny day".
5. Semantic search on thumbnails tends to return better results when matching large subjects that take up most of the frame. Small things like "cat" tend to not work well.
6. Experiment! Find a tracked object you want to test and start typing keywords and phrases to see what works for you.

## Triggers

Triggers utilize Semantic Search to automate actions when a tracked object matches a specified image or description. Triggers can be configured so that Frigate executes a specific actions when a tracked object's image or description matches a predefined image or text, based on a similarity threshold. Triggers are managed per camera and can be configured via the Frigate UI in the Settings page under the Triggers tab.

:::note

Semantic Search must be enabled to use Triggers.

:::

### Configuration

Triggers are defined within the `semantic_search` configuration for each camera in your Frigate configuration file or through the UI. Each trigger consists of a `friendly_name`, a `type` (either `thumbnail` or `description`), a `data` field (the reference image event ID or text), a `threshold` for similarity matching, and a list of `actions` to perform when the trigger fires - `notification`, `sub_label`, and `attribute`.

Triggers are best configured through the Frigate UI.

#### Managing Triggers in the UI

1. Navigate to the **Settings** page and select the **Triggers** tab.
2. Choose a camera from the dropdown menu to view or manage its triggers.
3. Click **Add Trigger** to create a new trigger or use the pencil icon to edit an existing one.
4. In the **Create Trigger** wizard:
   - Enter a **Name** for the trigger (e.g., "Red Car Alert").
   - Enter a descriptive **Friendly Name** for the trigger (e.g., "Red car on the driveway camera").
   - Select the **Type** (`Thumbnail` or `Description`).
   - For `Thumbnail`, select an image to trigger this action when a similar thumbnail image is detected, based on the threshold.
   - For `Description`, enter text to trigger this action when a similar tracked object description is detected.
   - Set the **Threshold** for similarity matching.
   - Select **Actions** to perform when the trigger fires.
     If native webpush notifications are enabled, check the `Send Notification` box to send a notification.
     Check the `Add Sub Label` box to add the trigger's friendly name as a sub label to any triggering tracked objects.
     Check the `Add Attribute` box to add the trigger's internal ID (e.g., "red_car_alert") to a data attribute on the tracked object that can be processed via the API or MQTT.
5. Save the trigger to update the configuration and store the embedding in the database.

When a trigger fires, the UI highlights the trigger with a blue dot for 3 seconds for easy identification. Additionally, the UI will show the last date/time and tracked object ID that activated your trigger. The last triggered timestamp is not saved to the database or persisted through restarts of Frigate.

### Usage and Best Practices

1. **Thumbnail Triggers**: Select a representative image (event ID) from the Explore page that closely matches the object you want to detect. For best results, choose images where the object is prominent and fills most of the frame.
2. **Description Triggers**: Write concise, specific text descriptions (e.g., "Person in a red jacket") that align with the tracked object’s description. Avoid vague terms to improve matching accuracy.
3. **Threshold Tuning**: Adjust the threshold to balance sensitivity and specificity. A higher threshold (e.g., 0.8) requires closer matches, reducing false positives but potentially missing similar objects. A lower threshold (e.g., 0.6) is more inclusive but may trigger more often.
4. **Using Explore**: Use the context menu or right-click / long-press on a tracked object in the Grid View in Explore to quickly add a trigger based on the tracked object's thumbnail.
5. **Editing triggers**: For the best experience, triggers should be edited via the UI. However, Frigate will ensure triggers edited in the config will be synced with triggers created and edited in the UI.

### Notes

- Triggers rely on the same Jina AI CLIP models (V1 or V2) used for semantic search. Ensure `semantic_search` is enabled and properly configured.
- Reindexing embeddings (via the UI or `reindex: True`) does not affect trigger configurations but may update the embeddings used for matching.
- For optimal performance, use a system with sufficient RAM (8GB minimum, 16GB recommended) and a GPU for `large` model configurations, as described in the Semantic Search requirements.

### FAQ

#### Why can't I create a trigger on thumbnails for some text, like "person with a blue shirt" and have it trigger when a person with a blue shirt is detected?

TL;DR: Text-to-image triggers aren’t supported because CLIP can confuse similar images and give inconsistent scores, making automation unreliable. The same word–image pair can give different scores and the score ranges can be too close together to set a clear cutoff.

Text-to-image triggers are not supported due to fundamental limitations of CLIP-based similarity search. While CLIP works well for exploratory, manual queries, it is unreliable for automated triggers based on a threshold. Issues include embedding drift (the same text–image pair can yield different cosine distances over time), lack of true semantic grounding (visually similar but incorrect matches), and unstable thresholding (distance distributions are dataset-dependent and often too tightly clustered to separate relevant from irrelevant results). Instead, it is recommended to set up a workflow with thumbnail triggers: first use text search to manually select 3–5 representative reference tracked objects, then configure thumbnail triggers based on that visual similarity. This provides robust automation without the semantic ambiguity of text to image matching.
