---
id: semantic_search
title: Using Semantic Search
---

Semantic Search in Frigate allows you to find tracked objects within your review items using either the image itself, a user-defined text description, or an automatically generated one. This feature works by creating _embeddings_ — numerical vector representations — for both the images and text descriptions of your tracked objects. By comparing these embeddings, Frigate assesses their similarities to deliver relevant search results.

Frigate has support for [Jina AI's CLIP model](https://huggingface.co/jinaai/jina-clip-v1) to create embeddings, which runs locally. Embeddings are then saved to Frigate's database.

Semantic Search is accessed via the _Explore_ view in the Frigate UI.

## Minimum System Requirements

Semantic Search works by running a large AI model locally on your system. Small or underpowered systems like a Raspberry Pi will not run Semantic Search reliably or at all.

A minimum of 8GB of RAM is required to use Semantic Search. A GPU is not strictly required but will provide a significant performance increase over CPU-only systems.

For best performance, 16GB or more of RAM and a dedicated GPU are recommended.

## Configuration

Semantic Search is disabled by default, and must be enabled in your config file before it can be used. Semantic Search is a global configuration setting.

```yaml
semantic_search:
  enabled: True
  reindex: False
```

:::tip

The embeddings database can be re-indexed from the existing tracked objects in your database by adding `reindex: True` to your `semantic_search` configuration. Depending on the number of tracked objects you have, it can take a long while to complete and may max out your CPU while indexing. Make sure to set the config back to `False` before restarting Frigate again.

If you are enabling the Search feature for the first time, be advised that Frigate does not automatically index older tracked objects. You will need to enable the `reindex` feature in order to do that.

:::

### Jina AI CLIP

The vision model is able to embed both images and text into the same vector space, which allows `image -> image` and `text -> image` similarity searches. Frigate uses this model on tracked objects to encode the thumbnail image and store it in the database. When searching for tracked objects via text in the search box, Frigate will perform a `text -> image` similarity search against this embedding. When clicking "Find Similar" in the tracked object detail pane, Frigate will perform an `image -> image` similarity search to retrieve the closest matching thumbnails.

The text model is used to embed tracked object descriptions and perform searches against them. Descriptions can be created, viewed, and modified on the Search page when clicking on the gray tracked object chip at the top left of each review item. See [the Generative AI docs](/configuration/genai.md) for more information on how to automatically generate tracked object descriptions.

Differently weighted CLIP models are available and can be selected by setting the `model_size` config option as `small` or `large`:

```yaml
semantic_search:
  enabled: True
  model_size: small
```

- Configuring the `large` model employs the full Jina model and will automatically run on the GPU if applicable.
- Configuring the `small` model employs a quantized version of the model that uses less RAM and runs on CPU with a very negligible difference in embedding quality.

### GPU Acceleration

The CLIP models are downloaded in ONNX format, and the `large` model can be accelerated using GPU hardware, when available. This depends on the Docker build that is used.

```yaml
semantic_search:
  enabled: True
  model_size: large
```

:::info

If the correct build is used for your GPU and the `large` model is configured, then the GPU will be detected and used automatically.

**NOTE:** Object detection and Semantic Search are independent features. If you want to use your GPU with Semantic Search, you must choose the appropriate Frigate Docker image for your GPU.

- **AMD**

  - ROCm will automatically be detected and used for Semantic Search in the `-rocm` Frigate image.

- **Intel**

  - OpenVINO will automatically be detected and used for Semantic Search in the default Frigate image.

- **Nvidia**
  - Nvidia GPUs will automatically be detected and used for Semantic Search in the `-tensorrt` Frigate image.
  - Jetson devices will automatically be detected and used for Semantic Search in the `-tensorrt-jp(4/5)` Frigate image.

:::

## Usage and Best Practices

1. Semantic Search is used in conjunction with the other filters available on the Search page. Use a combination of traditional filtering and Semantic Search for the best results.
2. Use the thumbnail search type when searching for particular objects in the scene. Use the description search type when attempting to discern the intent of your object.
3. Because of how the AI models Frigate uses have been trained, the comparison between text and image embedding distances generally means that with multi-modal (`thumbnail` and `description`) searches, results matching `description` will appear first, even if a `thumbnail` embedding may be a better match. Play with the "Search Type" setting to help find what you are looking for. Note that if you are generating descriptions for specific objects or zones only, this may cause search results to prioritize the objects with descriptions even if the the ones without them are more relevant.
4. Make your search language and tone closely match exactly what you're looking for. If you are using thumbnail search, **phrase your query as an image caption**. Searching for "red car" may not work as well as "red sedan driving down a residential street on a sunny day".
5. Semantic search on thumbnails tends to return better results when matching large subjects that take up most of the frame. Small things like "cat" tend to not work well.
6. Experiment! Find a tracked object you want to test and start typing keywords and phrases to see what works for you.
