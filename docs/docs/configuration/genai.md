---
id: genai
title: Generative AI
---

Generative AI can be used to automatically generate descriptions based on the thumbnails of your tracked objects. This helps with [Semantic Search](/configuration/semantic_search) in Frigate by providing detailed text descriptions as a basis of the search query.

Semantic Search must be enabled to use Generative AI. Descriptions are accessed via the _Explore_ view in the Frigate UI by clicking on a tracked object's thumbnail.

## Configuration

Generative AI can be enabled for all cameras or only for specific cameras. There are currently 3 providers available to integrate with Frigate.

If the provider you choose requires an API key, you may either directly paste it in your configuration, or store it in an environment variable prefixed with `FRIGATE_`.

```yaml
genai:
  enabled: True
  provider: gemini
  api_key: "{FRIGATE_GEMINI_API_KEY}"
  model: gemini-1.5-flash

cameras:
  front_camera: ...
  indoor_camera:
    genai: # <- disable GenAI for your indoor camera
      enabled: False
```

## Ollama

[Ollama](https://ollama.com/) allows you to self-host large language models and keep everything running locally. It provides a nice API over [llama.cpp](https://github.com/ggerganov/llama.cpp). It is highly recommended to host this server on a machine with an Nvidia graphics card, or on a Apple silicon Mac for best performance. Most of the 7b parameter 4-bit vision models will fit inside 8GB of VRAM. There is also a [docker container](https://hub.docker.com/r/ollama/ollama) available.

### Supported Models

You must use a vision capable model with Frigate. Current model variants can be found [in their model library](https://ollama.com/library). At the time of writing, this includes `llava`, `llava-llama3`, `llava-phi3`, and `moondream`.

:::note

You should have at least 8 GB of RAM available (or VRAM if running on GPU) to run the 7B models, 16 GB to run the 13B models, and 32 GB to run the 33B models.

:::

### Configuration

```yaml
genai:
  enabled: True
  provider: ollama
  base_url: http://localhost:11434
  model: llava
```

## Google Gemini

Google Gemini has a free tier allowing [15 queries per minute](https://ai.google.dev/pricing) to the API, which is more than sufficient for standard Frigate usage.

### Supported Models

You must use a vision capable model with Frigate. Current model variants can be found [in their documentation](https://ai.google.dev/gemini-api/docs/models/gemini). At the time of writing, this includes `gemini-1.5-pro` and `gemini-1.5-flash`.

### Get API Key

To start using Gemini, you must first get an API key from [Google AI Studio](https://aistudio.google.com).

1. Accept the Terms of Service
2. Click "Get API Key" from the right hand navigation
3. Click "Create API key in new project"
4. Copy the API key for use in your config

### Configuration

```yaml
genai:
  enabled: True
  provider: gemini
  api_key: "{FRIGATE_GEMINI_API_KEY}"
  model: gemini-1.5-flash
```

## OpenAI

OpenAI does not have a free tier for their API. With the release of gpt-4o, pricing has been reduced and each generation should cost fractions of a cent if you choose to go this route.

### Supported Models

You must use a vision capable model with Frigate. Current model variants can be found [in their documentation](https://platform.openai.com/docs/models). At the time of writing, this includes `gpt-4o` and `gpt-4-turbo`.

### Get API Key

To start using OpenAI, you must first [create an API key](https://platform.openai.com/api-keys) and [configure billing](https://platform.openai.com/settings/organization/billing/overview).

### Configuration

```yaml
genai:
  enabled: True
  provider: openai
  api_key: "{FRIGATE_OPENAI_API_KEY}"
  model: gpt-4o
```

## Azure OpenAI

Microsoft offers several vision models through Azure OpenAI. A subscription is required.

### Supported Models

You must use a vision capable model with Frigate. Current model variants can be found [in their documentation](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models). At the time of writing, this includes `gpt-4o` and `gpt-4-turbo`.

### Create Resource and Get API Key

To start using Azure OpenAI, you must first [create a resource](https://learn.microsoft.com/azure/cognitive-services/openai/how-to/create-resource?pivots=web-portal#create-a-resource). You'll need your API key and resource URL, which must include the `api-version` parameter (see the example below). The model field is not required in your configuration as the model is part of the deployment name you chose when deploying the resource.

### Configuration

```yaml
genai:
  enabled: True
  provider: azure_openai
  base_url: https://example-endpoint.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2023-03-15-preview
  api_key: "{FRIGATE_OPENAI_API_KEY}"
```

## Custom Prompts

Frigate sends multiple frames from the tracked object along with a prompt to your Generative AI provider asking it to generate a description. The default prompt is as follows:

```
Describe the {label} in the sequence of images with as much detail as possible. Do not describe the background.
```

:::tip

Prompts can use variable replacements like `{label}`, `{sub_label}`, and `{camera}` to substitute information from the tracked object as part of the prompt.

:::

You are also able to define custom prompts in your configuration.

```yaml
genai:
  enabled: True
  provider: ollama
  base_url: http://localhost:11434
  model: llava
  prompt: "Describe the {label} in these images from the {camera} security camera."
  object_prompts:
    person: "Describe the main person in these images (gender, age, clothing, activity, etc). Do not include where the activity is occurring (sidewalk, concrete, driveway, etc)."
    car: "Label the primary vehicle in these images with just the name of the company if it is a delivery vehicle, or the color make and model."
```

Prompts can also be overriden at the camera level to provide a more detailed prompt to the model about your specific camera, if you desire. By default, descriptions will be generated for all tracked objects and all zones. But you can also optionally specify `objects` and `required_zones` to only generate descriptions for certain tracked objects or zones.

Optionally, you can generate the description using a snapshot (if enabled) by setting `use_snapshot` to `True`. By default, this is set to `False`, which sends the thumbnails collected over the object's lifetime to the model. Using a snapshot provides the AI with a higher-resolution image (typically downscaled by the AI itself), but the trade-off is that only a single image is used, which might limit the model's ability to determine object movement or direction.

```yaml
cameras:
  front_door:
    genai:
      use_snapshot: True
      prompt: "Describe the {label} in these images from the {camera} security camera at the front door of a house, aimed outward toward the street."
      object_prompts:
        person: "Describe the main person in these images (gender, age, clothing, activity, etc). Do not include where the activity is occurring (sidewalk, concrete, driveway, etc). If delivering a package, include the company the package is from."
        cat: "Describe the cat in these images (color, size, tail). Indicate whether or not the cat is by the flower pots. If the cat is chasing a mouse, make up a name for the mouse."
      objects:
        - person
        - cat
      required_zones:
        - steps
```

### Experiment with prompts

Many providers also have a public facing chat interface for their models. Download a couple of different thumbnails or snapshots from Frigate and try new things in the playground to get descriptions to your liking before updating the prompt in Frigate.

- OpenAI - [ChatGPT](https://chatgpt.com)
- Gemini - [Google AI Studio](https://aistudio.google.com)
- Ollama - [Open WebUI](https://docs.openwebui.com/)
