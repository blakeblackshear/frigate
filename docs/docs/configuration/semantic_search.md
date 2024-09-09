---
id: semantic_search
title: Using Semantic Search
---

The Search feature in Frigate allows you to find tracked objects within your review items using either the image itself, a user-defined text description, or an automatically generated one. This semantic search functionality works by creating _embeddings_ — numerical vector representations — for both the images and text descriptions of your tracked objects. By comparing these embeddings, Frigate assesses their similarities to deliver relevant search results.

Frigate has support for two models to create embeddings, both of which run locally: [OpenAI CLIP](https://openai.com/research/clip) and [all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2). Embeddings are then saved to a local instance of [ChromaDB](https://trychroma.com).

## Configuration

Semantic Search is a global configuration setting.

```yaml
semantic_search:
  enabled: True
  reindex: False
```

:::tip

The embeddings database can be re-indexed from the existing tracked objects in your database by adding `reindex: True` to your `semantic_search` configuration. Depending on the number of tracked objects you have, it can take a long while to complete and may max out your CPU while indexing. Make sure to set the config back to `False` before restarting Frigate again.

If you are enabling the Search feature for the first time, be advised that Frigate does not automatically index older tracked objects. You will need to enable the `reindex` feature in order to do that.

:::

### OpenAI CLIP

This model is able to embed both images and text into the same vector space, which allows `image -> image` and `text -> image` similarity searches. Frigate uses this model on tracked objects to encode the thumbnail image and store it in Chroma. When searching for tracked objects via text in the search box, Frigate will perform a `text -> image` similarity search against this embedding. When clicking "Find Similar" in the tracked object detail pane, Frigate will perform an `image -> image` similarity search to retrieve the closest matching thumbnails.

### all-MiniLM-L6-v2

This is a sentence embedding model that has been fine tuned on over 1 billion sentence pairs. This model is used to embed tracked object descriptions and perform searches against them. Descriptions can be created, viewed, and modified on the Search page when clicking on the gray tracked object chip at the top left of each review item. See [the Generative AI docs](/configuration/genai.md) for more information on how to automatically generate event descriptions.

## Usage

1. Semantic search is used in conjunction with the other filters available on the Search page. Use a combination of traditional filtering and semantic search for the best results.
2. The comparison between text and image embedding distances generally means that results matching `description` will appear first, even if a `thumbnail` embedding may be a better match. Play with the "Search Type" filter to help find what you are looking for.
3. Make your search language and tone closely match your descriptions. If you are using thumbnail search, phrase your query as an image caption.
4. Semantic search on thumbnails tends to return better results when matching large subjects that take up most of the frame. Small things like "cat" tend to not work well.
5. Experiment! Find a tracked object you want to test and start typing keywords to see what works for you.
