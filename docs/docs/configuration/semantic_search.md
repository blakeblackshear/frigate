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

The V1 text model is used to embed tracked object descriptions and perform searches against them. Descriptions can be created, viewed, and modified on the Explore page when clicking on thumbnail of a tracked object. See [the Generative AI docs](/configuration/genai.md) for more information on how to automatically generate tracked object descriptions.

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

The CLIP models are downloaded in ONNX format, and the `large` model can be accelerated using GPU hardware, when available. This depends on the Docker build that is used.

```yaml
semantic_search:
  enabled: True
  model_size: large
```

:::info

If the correct build is used for your GPU and the `large` model is configured, then the GPU will be detected and used automatically.

See the [Hardware Accelerated Enrichments](/configuration/hardware_acceleration_enrichments.md) documentation.

:::

## Usage and Best Practices

1. Semantic Search is used in conjunction with the other filters available on the Explore page. Use a combination of traditional filtering and Semantic Search for the best results.
2. Use the thumbnail search type when searching for particular objects in the scene. Use the description search type when attempting to discern the intent of your object.
3. Because of how the AI models Frigate uses have been trained, the comparison between text and image embedding distances generally means that with multi-modal (`thumbnail` and `description`) searches, results matching `description` will appear first, even if a `thumbnail` embedding may be a better match. Play with the "Search Type" setting to help find what you are looking for. Note that if you are generating descriptions for specific objects or zones only, this may cause search results to prioritize the objects with descriptions even if the the ones without them are more relevant.
4. Make your search language and tone closely match exactly what you're looking for. If you are using thumbnail search, **phrase your query as an image caption**. Searching for "red car" may not work as well as "red sedan driving down a residential street on a sunny day".
5. Semantic search on thumbnails tends to return better results when matching large subjects that take up most of the frame. Small things like "cat" tend to not work well.
6. Experiment! Find a tracked object you want to test and start typing keywords and phrases to see what works for you.
