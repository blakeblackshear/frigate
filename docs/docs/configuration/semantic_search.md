---
id: semantic_search
title: Using Semantic Search
---

Semantic search works by embedding images and/or text into a vector representation identified by numbers. Frigate has support for two such models which both run locally: [OpenAI CLIP](https://openai.com/research/clip) and [all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2). Embeddings are then saved to a local instance of [ChromaDB](https://trychroma.com).

## Configuration

Semantic Search is a global configuration setting.

```yaml
semantic_search:
  enabled: True
  reindex: False
```

:::tip

The embeddings database can be re-indexed from the existing detections in your database by adding `reindex: True` to your `semantic_search` configuration. Depending on the number of detections you have, it can take up to 30 minutes to complete and may max out your CPU while indexing. Make sure to set the config back to `False` before restarting Frigate again.

:::

### OpenAI CLIP

This model is able to embed both images and text into the same vector space, which allows `image -> image` and `text -> image` similarity searches. Frigate uses this model on detections to encode the thumbnail image and store it in Chroma. When searching detections via text in the search box, frigate will perform a `text -> image` similarity search against this embedding. When clicking "FIND SIMILAR" next to a detection, Frigate will perform an `image -> image` similarity search to retrieve the closest matching thumbnails.

### all-MiniLM-L6-v2

This is a sentence embedding model that has been fine tuned on over 1 billion sentence pairs. This model is used to embed detection descriptions and perform searches against them. Descriptions can be created and/or modified on the search page when clicking on the info icon next to a detection. See [the Generative AI docs](/configuration/genai.md) for more information on how to automatically generate event descriptions.

## Usage Tips

1. Semantic search is used in conjunction with the other filters available on the search page. Use a combination of traditional filtering and semantic search for the best results.
2. The comparison between text and image embedding distances generally means that results matching `description` will appear first, even if a `thumbnail` embedding may be a better match. Play with the "Search Type" filter to help find what you are looking for.
3. Make your search language and tone closely match your descriptions. If you are using thumbnail search, phrase your query as an image caption.
4. Semantic search on thumbnails tends to return better results when matching large subjects that take up most of the frame. Small things like "cat" tend to not work well.
5. Experiment! Find a detection you want to test and start typing keywords to see what works for you.
