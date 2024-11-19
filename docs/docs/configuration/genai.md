---
id: genai
title: Generative AI
---

Generative AI can be used to automatically generate descriptive text based on the thumbnails of your tracked objects. This helps with [Semantic Search](/configuration/semantic_search) in Frigate to provide more context about your tracked objects. Descriptions are accessed via the _Explore_ view in the Frigate UI by clicking on a tracked object's thumbnail.

:::info

Semantic Search must be enabled to use Generative AI.

:::

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

:::warning

Using Ollama on CPU is not recommended, high inference times make using Generative AI impractical.

:::

[Ollama](https://ollama.com/) allows you to self-host large language models and keep everything running locally. It provides a nice API over [llama.cpp](https://github.com/ggerganov/llama.cpp). It is highly recommended to host this server on a machine with an Nvidia graphics card, or on a Apple silicon Mac for best performance.

Most of the 7b parameter 4-bit vision models will fit inside 8GB of VRAM. There is also a [Docker container](https://hub.docker.com/r/ollama/ollama) available.

Parallel requests also come with some caveats. You will need to set `OLLAMA_NUM_PARALLEL=1` and choose a `OLLAMA_MAX_QUEUE` and `OLLAMA_MAX_LOADED_MODELS` values that are appropriate for your hardware and preferences. See the [Ollama documentation](https://github.com/ollama/ollama/blob/main/docs/faq.md#how-does-ollama-handle-concurrent-requests).

### Supported Models

You must use a vision capable model with Frigate. Current model variants can be found [in their model library](https://ollama.com/library). At the time of writing, this includes `llava`, `llava-llama3`, `llava-phi3`, and `moondream`. Note that Frigate will not automatically download the model you specify in your config, you must download the model to your local instance of Ollama first i.e. by running `ollama pull llava:7b` on your Ollama server/Docker container. Note that the model specified in Frigate's config must match the downloaded model tag.

:::note

You should have at least 8 GB of RAM available (or VRAM if running on GPU) to run the 7B models, 16 GB to run the 13B models, and 32 GB to run the 33B models.

:::

### Configuration

```yaml
genai:
  enabled: True
  provider: ollama
  base_url: http://localhost:11434
  model: llava:7b
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

## Usage and Best Practices

Frigate's thumbnail search excels at identifying specific details about tracked objects – for example, using an "image caption" approach to find a "person wearing a yellow vest," "a white dog running across the lawn," or "a red car on a residential street." To enhance this further, Frigate’s default prompts are designed to ask your AI provider about the intent behind the object's actions, rather than just describing its appearance.

While generating simple descriptions of detected objects is useful, understanding intent provides a deeper layer of insight. Instead of just recognizing "what" is in a scene, Frigate’s default prompts aim to infer "why" it might be there or "what" it could do next. Descriptions tell you what’s happening, but intent gives context. For instance, a person walking toward a door might seem like a visitor, but if they’re moving quickly after hours, you can infer a potential break-in attempt. Detecting a person loitering near a door at night can trigger an alert sooner than simply noting "a person standing by the door," helping you respond based on the situation’s context.

### Using GenAI for notifications

Frigate provides an [MQTT topic](/integrations/mqtt), `frigate/tracked_object_update`, that is updated with a JSON payload containing `event_id` and `description` when your AI provider returns a description for a tracked object. This description could be used directly in notifications, such as sending alerts to your phone or making audio announcements. If additional details from the tracked object are needed, you can query the [HTTP API](/integrations/api) using the `event_id`, eg: `http://frigate_ip:5000/api/events/<event_id>`.

## Custom Prompts

Frigate sends multiple frames from the tracked object along with a prompt to your Generative AI provider asking it to generate a description. The default prompt is as follows:

```
Analyze the sequence of images containing the {label}. Focus on the likely intent or behavior of the {label} based on its actions and movement, rather than describing its appearance or the surroundings. Consider what the {label} is doing, why, and what it might do next.
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
  prompt: "Analyze the {label} in these images from the {camera} security camera. Focus on the actions, behavior, and potential intent of the {label}, rather than just describing its appearance."
  object_prompts:
    person: "Examine the main person in these images. What are they doing and what might their actions suggest about their intent (e.g., approaching a door, leaving an area, standing still)? Do not describe the surroundings or static details."
    car: "Observe the primary vehicle in these images. Focus on its movement, direction, or purpose (e.g., parking, approaching, circling). If it's a delivery vehicle, mention the company."
```

Prompts can also be overriden at the camera level to provide a more detailed prompt to the model about your specific camera, if you desire. By default, descriptions will be generated for all tracked objects and all zones. But you can also optionally specify `objects` and `required_zones` to only generate descriptions for certain tracked objects or zones.

Optionally, you can generate the description using a snapshot (if enabled) by setting `use_snapshot` to `True`. By default, this is set to `False`, which sends the uncompressed images from the `detect` stream collected over the object's lifetime to the model. Once the object lifecycle ends, only a single compressed and cropped thumbnail is saved with the tracked object. Using a snapshot might be useful when you want to _regenerate_ a tracked object's description as it will provide the AI with a higher-quality image (typically downscaled by the AI itself) than the cropped/compressed thumbnail. Using a snapshot otherwise has a trade-off in that only a single image is sent to your provider, which will limit the model's ability to determine object movement or direction.

```yaml
cameras:
  front_door:
    genai:
      use_snapshot: True
      prompt: "Analyze the {label} in these images from the {camera} security camera at the front door. Focus on the actions and potential intent of the {label}."
      object_prompts:
        person: "Examine the person in these images. What are they doing, and how might their actions suggest their purpose (e.g., delivering something, approaching, leaving)? If they are carrying or interacting with a package, include details about its source or destination."
        cat: "Observe the cat in these images. Focus on its movement and intent (e.g., wandering, hunting, interacting with objects). If the cat is near the flower pots or engaging in any specific actions, mention it."
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
