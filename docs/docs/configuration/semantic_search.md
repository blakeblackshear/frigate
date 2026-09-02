---
id: semantic_search
title: Semantic Search
---

import ConfigTabs from "@site/src/components/ConfigTabs";
import TabItem from "@theme/TabItem";
import NavPath from "@site/src/components/NavPath";

Semantic Search in Frigate allows you to find tracked objects within your review items using either the image itself, a user-defined text description, or an automatically generated one. This feature works by creating _embeddings_, numerical vector representations, for both the images and text descriptions of your tracked objects. By comparing these embeddings, Frigate assesses their similarities to deliver relevant search results.

By default, Frigate uses local models from [Jina AI](https://huggingface.co/jinaai) to create and save embeddings in Frigate's database. Frigate can also use a configured GenAI provider, with embedding inference running on a separate local or remote model server.

Semantic Search is accessed via the _Explore_ view in the Frigate UI.

:::info

The built-in Jina models require a one-time internet connection to download model files from Hugging Face. Once cached, they work fully offline. GenAI providers have their own model download and network requirements. See [Network Requirements](/frigate/network_requirements#one-time-model-downloads) for details.

:::

## Minimum System Requirements

The requirements in this section apply when the built-in Jina model runs on the Frigate host. A GenAI provider such as vLLM can move embedding inference to a separate GPU server.

Small or underpowered systems like a Raspberry Pi will not run the built-in Semantic Search models reliably or at all.

A minimum of 8GB of RAM is required on the Frigate host when using the built-in Jina models. Those models also require a CPU with AVX + AVX2 instructions. A GPU is not strictly required for the built-in models, but it will provide a significant performance increase over CPU-only systems.

For best performance with the built-in models, 16GB or more of RAM and a dedicated GPU are recommended. When using a GenAI provider, size the model server according to that provider and model instead.

## Configuration

Semantic Search is disabled by default and must be enabled before it can be used. Semantic Search is a global configuration setting.

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > Enrichments > Semantic search" />.

- Set **Enable semantic search** to on

</TabItem>
<TabItem value="yaml">

```yaml
semantic_search:
  enabled: True
  reindex: False
```

</TabItem>
</ConfigTabs>

:::tip

The embeddings database can be re-indexed from the existing tracked objects in your database by pressing the "Reindex" button in the Enrichments Settings in the UI or by adding `reindex: True` to your `semantic_search` configuration and restarting Frigate. Depending on the number of tracked objects you have, it can take a long while to complete and may heavily load the selected embedding backend. A reindex through a remote GenAI provider also sends every historical tracked-object thumbnail and description being indexed to that server.

If you are enabling Semantic Search for the first time, Frigate does not automatically index older tracked objects. You will need to reindex as described above. If a reindex is interrupted or fails, Frigate records the incomplete state and keeps search and semantic triggers unavailable after a restart until you request another full reindex.

:::

### Jina AI CLIP (version 1)

The [V1 model from Jina](https://huggingface.co/jinaai/jina-clip-v1) has a vision model which is able to embed both images and text into the same vector space, which allows `image -> image` and `text -> image` similarity searches. Frigate uses this model on tracked objects to encode the thumbnail image and store it in the database. When searching for tracked objects via text in the search box, Frigate will perform a `text -> image` similarity search against this embedding. When clicking "Find Similar" in the tracked object detail pane, Frigate will perform an `image -> image` similarity search to retrieve the closest matching thumbnails.

The V1 text model is used to embed tracked object descriptions and perform searches against them. Descriptions can be created, viewed, and modified on the Explore page when clicking on thumbnail of a tracked object. See [the object description docs](/configuration/genai/objects.md) for more information on how to automatically generate tracked object descriptions.

Differently weighted versions of the Jina models are available and can be selected by setting the model size.

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > Enrichments > Semantic search" />.

| Field                                            | Description                                                                |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| **Semantic search model or GenAI provider name** | Select `jinav1` to use the Jina AI CLIP V1 model                           |
| **Model size**                                   | `small` (quantized, CPU-friendly) or `large` (full model, GPU-accelerated) |

</TabItem>
<TabItem value="yaml">

```yaml
semantic_search:
  enabled: True
  model: "jinav1"
  model_size: small
```

</TabItem>
</ConfigTabs>

- Configuring the `large` model employs the full Jina model and will automatically run on the GPU if applicable.
- Configuring the `small` model employs a quantized version of the Jina model that uses less RAM and runs on CPU with a very negligible difference in embedding quality.

### Jina AI CLIP (version 2)

Frigate also supports the [V2 model from Jina](https://huggingface.co/jinaai/jina-clip-v2), which introduces multilingual support (89 languages). In contrast, the V1 model only supports English.

V2 offers only a 3% performance improvement over V1 in both text-image and text-text retrieval tasks, an upgrade that is unlikely to yield noticeable real-world benefits. Additionally, V2 has _significantly_ higher RAM and GPU requirements, leading to increased inference time and memory usage. If you plan to use V2, ensure your system has ample RAM and a discrete GPU. CPU inference (with the `small` model) using V2 is not recommended.

To use the V2 model, set the model to `jinav2`.

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > Enrichments > Semantic search" />.

| Field                                            | Description                                           |
| ------------------------------------------------ | ----------------------------------------------------- |
| **Semantic search model or GenAI provider name** | Select `jinav2` to use the Jina AI CLIP V2 model      |
| **Model size**                                   | `large` is recommended for V2 (requires discrete GPU) |

</TabItem>
<TabItem value="yaml">

```yaml
semantic_search:
  enabled: True
  model: "jinav2"
  model_size: large
```

</TabItem>
</ConfigTabs>

For most users, especially native English speakers, the V1 model remains the recommended choice.

:::note

Switching between V1 and V2 requires reindexing your embeddings. The embeddings from V1 and V2 are incompatible, and failing to reindex will result in incorrect search results.

:::

### GenAI Provider

Frigate can use a GenAI provider for semantic search embeddings when that provider has the `embeddings` role. The **llama.cpp** and **vLLM** providers support multimodal embeddings (both text and images).

To use a provider for semantic search:

1. Configure a GenAI provider with `embeddings` in its `roles`.
2. Set a non-empty provider `model` that matches the model served by the backend.
3. Set the semantic search model to the GenAI config key (e.g. `default`).
4. Start the model server with its multimodal embeddings endpoint enabled.

The provider's `base_url` and `model` are required. For vLLM, `base_url` must point to the OpenAI API root and end in `/v1`.

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > Enrichments > Semantic search" />.

| Field                                            | Description                                                                                    |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| **Semantic search model or GenAI provider name** | Set to the GenAI config key (e.g. `default`) to use a configured GenAI provider for embeddings |

The GenAI provider must also be configured with the `embeddings` role under <NavPath path="Settings > Enrichments > Generative AI" />.

</TabItem>
<TabItem value="yaml">

```yaml
genai:
  qwen_embeddings:
    provider: vllm
    base_url: http://vllm:8000/v1
    model: Qwen/Qwen3-VL-Embedding-2B
    roles:
      - embeddings

semantic_search:
  enabled: True
  model: qwen_embeddings
  reindex: True # Set back to False after the initial reindex completes.
```

</TabItem>
</ConfigTabs>

For the official Hugging Face Qwen model, use vLLM 0.14.0 or newer and start it with `vllm serve Qwen/Qwen3-VL-Embedding-2B --runner pooling --limit-mm-per-prompt '{"image": 1}' --max-model-len 8192`. See the [vLLM embedding documentation](https://docs.vllm.ai/en/latest/models/pooling_models/embed/) for details.

Before starting Frigate with `reindex: True`, wait until vLLM has loaded the model and its `/v1/models` endpoint responds. The startup reindex begins immediately.

Frigate's sqlite-vec tables use 768-dimensional vectors. Qwen3-VL-Embedding-2B supports Matryoshka Representation Learning (MRL), so Frigate requests 768 output dimensions from vLLM and normalizes the resulting vector before storage. The adapter also enforces the expected size as a compatibility safeguard.

For a compatible GGUF model, llama.cpp must be started with `--embeddings` and `--mmproj`. See the [llama.cpp server documentation](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md) for details.

When the provider is remote, Frigate sends tracked-object thumbnails, descriptions, and search query text to that server. This includes historical data processed during a reindex. Use the built-in Jina models or a model server on infrastructure you trust if this data must remain on the Frigate host or local network.

:::note

Embeddings from different models or instructions are incompatible, even when they use the same vector size. When the selected GenAI provider is changed through a runtime config update, Frigate automatically starts a full reindex with the new embedding configuration. If you change the provider, model, or embedding instruction in static YAML and restart Frigate, set `semantic_search.reindex: True` for that startup, then set it back to `False` after the reindex completes. If a persisted index fingerprint does not match, Frigate fails closed instead of searching incompatible vectors.

:::

### GPU Acceleration

The CLIP models are downloaded in ONNX format, and the `large` model can be accelerated using GPU hardware, when available. This depends on the Docker build that is used. You can also target a specific device in a multi-GPU installation.

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > Enrichments > Semantic search" />.

| Field          | Description                                                            |
| -------------- | ---------------------------------------------------------------------- |
| **Model size** | Set to `large` to enable GPU acceleration                              |
| **Device**     | (Optional) Specify a GPU device index in a multi-GPU system (e.g. `0`) |

</TabItem>
<TabItem value="yaml">

```yaml
semantic_search:
  enabled: True
  model_size: large
  # Optional, if using the 'large' model in a multi-GPU installation
  device: 0
```

</TabItem>
</ConfigTabs>

:::info

If the correct build is used for your GPU / NPU and the `large` model is configured, then the GPU will be detected and used automatically.
Specify the `device` option to target a specific GPU in a multi-GPU system (see [onnxruntime's provider options](https://onnxruntime.ai/docs/execution-providers/)).
If you do not specify a device, the first available GPU will be used.

See the [Hardware Accelerated Enrichments](/configuration/hardware_acceleration_enrichments.md) documentation.

:::

## Usage and Best Practices

For tips on getting the best results from Semantic Search (choosing between thumbnail and description search, phrasing queries effectively, and combining search with the other Explore filters), see [Usage and best practices](/usage/explore#usage-and-best-practices) in the Usage docs.

## Triggers

Triggers utilize Semantic Search to automate actions when a tracked object matches a specified image or description. Triggers can be configured so that Frigate executes specific actions when a tracked object's image or description matches a predefined image or text, based on a similarity threshold. Triggers are managed per camera and can be configured via the Frigate UI in the Settings page under the Triggers tab.

:::note

Semantic Search must be enabled to use Triggers.

:::

### Configuration

Triggers are defined within the `semantic_search` configuration for each camera. Each trigger consists of a `friendly_name`, a `type` (either `thumbnail` or `description`), a `data` field (the reference image event ID or text), a `threshold` for similarity matching, and a list of `actions` to perform when the trigger fires - `notification`, `sub_label`, and `attribute`.

Triggers are best configured through the Frigate UI.

#### Managing Triggers in the UI

1. Navigate to <NavPath path="Settings > Enrichments > Triggers" /> and select a camera from the dropdown menu.
2. Click **Add Trigger** to create a new trigger or use the pencil icon to edit an existing one.
3. In the **Create Trigger** wizard:
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
4. Save the trigger to update the configuration and store the embedding in the database.

When a trigger fires, the UI highlights the trigger with a blue dot for 3 seconds for easy identification. Additionally, the UI will show the last date/time and tracked object ID that activated your trigger. The last triggered timestamp is not saved to the database or persisted through restarts of Frigate.

### Usage and Best Practices

1. **Thumbnail Triggers**: Select a representative image (event ID) from the Explore page that closely matches the object you want to detect. For best results, choose images where the object is prominent and fills most of the frame.
2. **Description Triggers**: Write concise, specific text descriptions (e.g., "Person in a red jacket") that align with the tracked object's description. Avoid vague terms to improve matching accuracy.
3. **Threshold Tuning**: Adjust the threshold to balance sensitivity and specificity. A higher threshold (e.g., 0.8) requires closer matches, reducing false positives but potentially missing similar objects. A lower threshold (e.g., 0.6) is more inclusive but may trigger more often.
4. **Using Explore**: Use the context menu or right-click / long-press on a tracked object in the Grid View in Explore to quickly add a trigger based on the tracked object's thumbnail.
5. **Editing triggers**: For the best experience, triggers should be edited via the UI. However, Frigate will ensure triggers edited in the config will be synced with triggers created and edited in the UI.

### Notes

- Triggers use the same active embedding backend as semantic search, either a built-in Jina model or a configured GenAI provider. Ensure `semantic_search` is enabled and properly configured.
- Reindexing embeddings (via the UI or `reindex: True`) does not affect trigger configurations but may update the embeddings used for matching.
- For built-in Jina models, use a Frigate host with sufficient RAM (8GB minimum, 16GB recommended) and a GPU for `large` model configurations. For a GenAI backend, the model server must meet the selected model's resource requirements.

### FAQ

#### Why can't I create a trigger on thumbnails for some text, like "person with a blue shirt" and have it trigger when a person with a blue shirt is detected?

TL;DR: Text-to-image triggers aren't supported because CLIP can confuse similar images and give inconsistent scores, making automation unreliable. The same word-image pair can give different scores and the score ranges can be too close together to set a clear cutoff.

Text-to-image triggers are not supported due to fundamental limitations of CLIP-based similarity search. While CLIP works well for exploratory, manual queries, it is unreliable for automated triggers based on a threshold. Issues include embedding drift (the same text-image pair can yield different cosine distances over time), lack of true semantic grounding (visually similar but incorrect matches), and unstable thresholding (distance distributions are dataset-dependent and often too tightly clustered to separate relevant from irrelevant results). Instead, it is recommended to set up a workflow with thumbnail triggers: first use text search to manually select 3-5 representative reference tracked objects, then configure thumbnail triggers based on that visual similarity. This provides robust automation without the semantic ambiguity of text to image matching.
