---
id: genai
title: Generative AI
---

Generative AI can be used to automatically generate descriptive text based on the thumbnails of your tracked objects. This helps with [Semantic Search](/configuration/semantic_search) in Frigate to provide more context about your tracked objects. Descriptions are accessed via the _Explore_ view in the Frigate UI by clicking on a tracked object's thumbnail.

Requests for a description are sent off automatically to your AI provider at the end of the tracked object's lifecycle, or can optionally be sent earlier after a number of significantly changed frames, for example in use in more real-time notifications. Descriptions can also be regenerated manually via the Frigate UI. Note that if you are manually entering a description for tracked objects prior to its end, this will be overwritten by the generated response.

## Configuration

Generative AI can be enabled for all cameras or only for specific cameras. If GenAI is disabled for a camera, you can still manually generate descriptions for events using the HTTP API. There are currently 3 native providers available to integrate with Frigate. Other providers that support the OpenAI standard API can also be used. See the OpenAI section below.

To use Generative AI, you must define a single provider at the global level of your Frigate configuration. If the provider you choose requires an API key, you may either directly paste it in your configuration, or store it in an environment variable prefixed with `FRIGATE_`.

```yaml
genai:
  provider: gemini
  api_key: "{FRIGATE_GEMINI_API_KEY}"
  model: gemini-2.0-flash

cameras:
  front_camera:
    genai:
      enabled: True # <- enable GenAI for your front camera
      use_snapshot: True
      objects:
        - person
      required_zones:
        - steps
  indoor_camera:
    objects:
      genai:
        enabled: False # <- disable GenAI for your indoor camera
```

By default, descriptions will be generated for all tracked objects and all zones. But you can also optionally specify `objects` and `required_zones` to only generate descriptions for certain tracked objects or zones.

Optionally, you can generate the description using a snapshot (if enabled) by setting `use_snapshot` to `True`. By default, this is set to `False`, which sends the uncompressed images from the `detect` stream collected over the object's lifetime to the model. Once the object lifecycle ends, only a single compressed and cropped thumbnail is saved with the tracked object. Using a snapshot might be useful when you want to _regenerate_ a tracked object's description as it will provide the AI with a higher-quality image (typically downscaled by the AI itself) than the cropped/compressed thumbnail. Using a snapshot otherwise has a trade-off in that only a single image is sent to your provider, which will limit the model's ability to determine object movement or direction.

Generative AI can also be toggled dynamically for a camera via MQTT with the topic `frigate/<camera_name>/object_descriptions/set`. See the [MQTT documentation](/integrations/mqtt/#frigatecamera_nameobjectdescriptionsset).

## Ollama

:::warning

Using Ollama on CPU is not recommended, high inference times make using Generative AI impractical.

:::

[Ollama](https://ollama.com/) allows you to self-host large language models and keep everything running locally. It is highly recommended to host this server on a machine with an Nvidia graphics card, or on a Apple silicon Mac for best performance.

Most of the 7b parameter 4-bit vision models will fit inside 8GB of VRAM. There is also a [Docker container](https://hub.docker.com/r/ollama/ollama) available.

Parallel requests also come with some caveats. You will need to set `OLLAMA_NUM_PARALLEL=1` and choose a `OLLAMA_MAX_QUEUE` and `OLLAMA_MAX_LOADED_MODELS` values that are appropriate for your hardware and preferences. See the [Ollama documentation](https://docs.ollama.com/faq#how-does-ollama-handle-concurrent-requests).

### Model Types: Instruct vs Thinking

Most vision-language models are available as **instruct** models, which are fine-tuned to follow instructions and respond concisely to prompts. However, some models (such as certain Qwen-VL or minigpt variants) offer both **instruct** and **thinking** versions.

- **Instruct models** are always recommended for use with Frigate. These models generate direct, relevant, actionable descriptions that best fit Frigate's object and event summary use case.
- **Thinking models** are fine-tuned for more free-form, open-ended, and speculative outputs, which are typically not concise and may not provide the practical summaries Frigate expects. For this reason, Frigate does **not** recommend or support using thinking models.

Some models are labeled as **hybrid** (capable of both thinking and instruct tasks). In these cases, Frigate will always use instruct-style prompts and specifically disables thinking-mode behaviors to ensure concise, useful responses.

**Recommendation:**
Always select the `-instruct` or documented instruct/tagged variant of any model you use in your Frigate configuration. If in doubt, refer to your model provider’s documentation or model library for guidance on the correct model variant to use.



### Supported Models

You must use a vision capable model with Frigate. Current model variants can be found [in their model library](https://ollama.com/search?c=vision). Note that Frigate will not automatically download the model you specify in your config, you must download the model to your local instance of Ollama first i.e. by running `ollama pull qwen3-vl:2b-instruct` on your Ollama server/Docker container. Note that the model specified in Frigate's config must match the downloaded model tag.

:::note

You should have at least 8 GB of RAM available (or VRAM if running on GPU) to run the 7B models, 16 GB to run the 13B models, and 32 GB to run the 33B models.

:::

#### Ollama Cloud models

Ollama also supports [cloud models](https://ollama.com/cloud), where your local Ollama instance handles requests from Frigate, but model inference is performed in the cloud. Set up Ollama locally, sign in with your Ollama account, and specify the cloud model name in your Frigate config. For more details, see the Ollama cloud model [docs](https://docs.ollama.com/cloud).

### Configuration

```yaml
genai:
  provider: ollama
  base_url: http://localhost:11434
  model: qwen3-vl:4b
```

## Google Gemini

Google Gemini has a free tier allowing [15 queries per minute](https://ai.google.dev/pricing) to the API, which is more than sufficient for standard Frigate usage.

### Supported Models

You must use a vision capable model with Frigate. Current model variants can be found [in their documentation](https://ai.google.dev/gemini-api/docs/models/gemini).

### Get API Key

To start using Gemini, you must first get an API key from [Google AI Studio](https://aistudio.google.com).

1. Accept the Terms of Service
2. Click "Get API Key" from the right hand navigation
3. Click "Create API key in new project"
4. Copy the API key for use in your config

### Configuration

```yaml
genai:
  provider: gemini
  api_key: "{FRIGATE_GEMINI_API_KEY}"
  model: gemini-2.0-flash
```

:::note

To use a different Gemini-compatible API endpoint, set the `GEMINI_BASE_URL` environment variable to your provider's API URL.

:::

## OpenAI

OpenAI does not have a free tier for their API. With the release of gpt-4o, pricing has been reduced and each generation should cost fractions of a cent if you choose to go this route.

### Supported Models

You must use a vision capable model with Frigate. Current model variants can be found [in their documentation](https://platform.openai.com/docs/models).

### Get API Key

To start using OpenAI, you must first [create an API key](https://platform.openai.com/api-keys) and [configure billing](https://platform.openai.com/settings/organization/billing/overview).

### Configuration

```yaml
genai:
  provider: openai
  api_key: "{FRIGATE_OPENAI_API_KEY}"
  model: gpt-4o
```

:::note

To use a different OpenAI-compatible API endpoint, set the `OPENAI_BASE_URL` environment variable to your provider's API URL.

:::

## Azure OpenAI

Microsoft offers several vision models through Azure OpenAI. A subscription is required.

### Supported Models

You must use a vision capable model with Frigate. Current model variants can be found [in their documentation](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models).

### Create Resource and Get API Key

To start using Azure OpenAI, you must first [create a resource](https://learn.microsoft.com/azure/cognitive-services/openai/how-to/create-resource?pivots=web-portal#create-a-resource). You'll need your API key, model name, and resource URL, which must include the `api-version` parameter (see the example below).

### Configuration

```yaml
genai:
  provider: azure_openai
  base_url: https://instance.cognitiveservices.azure.com/openai/responses?api-version=2025-04-01-preview
  model: gpt-5-mini
  api_key: "{FRIGATE_OPENAI_API_KEY}"
```

## Usage and Best Practices

Frigate's thumbnail search excels at identifying specific details about tracked objects – for example, using an "image caption" approach to find a "person wearing a yellow vest," "a white dog running across the lawn," or "a red car on a residential street." To enhance this further, Frigate’s default prompts are designed to ask your AI provider about the intent behind the object's actions, rather than just describing its appearance.

While generating simple descriptions of detected objects is useful, understanding intent provides a deeper layer of insight. Instead of just recognizing "what" is in a scene, Frigate’s default prompts aim to infer "why" it might be there or "what" it could do next. Descriptions tell you what’s happening, but intent gives context. For instance, a person walking toward a door might seem like a visitor, but if they’re moving quickly after hours, you can infer a potential break-in attempt. Detecting a person loitering near a door at night can trigger an alert sooner than simply noting "a person standing by the door," helping you respond based on the situation’s context.

### Using GenAI for notifications

Frigate provides an [MQTT topic](/integrations/mqtt), `frigate/tracked_object_update`, that is updated with a JSON payload containing `event_id` and `description` when your AI provider returns a description for a tracked object. This description could be used directly in notifications, such as sending alerts to your phone or making audio announcements. If additional details from the tracked object are needed, you can query the [HTTP API](/integrations/api/event-events-event-id-get) using the `event_id`, eg: `http://frigate_ip:5000/api/events/<event_id>`.

If looking to get notifications earlier than when an object ceases to be tracked, an additional send trigger can be configured of `after_significant_updates`.

```yaml
genai:
  send_triggers:
    tracked_object_end: true # default
    after_significant_updates: 3 # how many updates to a tracked object before we should send an image
```

## Custom Prompts

Frigate sends multiple frames from the tracked object along with a prompt to your Generative AI provider asking it to generate a description. The default prompt is as follows:

```
Analyze the sequence of images containing the {label}. Focus on the likely intent or behavior of the {label} based on its actions and movement, rather than describing its appearance or the surroundings. Consider what the {label} is doing, why, and what it might do next.
```

:::tip

Prompts can use variable replacements `{label}`, `{sub_label}`, and `{camera}` to substitute information from the tracked object as part of the prompt.

:::

You are also able to define custom prompts in your configuration.

```yaml
genai:
  provider: ollama
  base_url: http://localhost:11434
  model: qwen3-vl:8b-instruct

objects:
  prompt: "Analyze the {label} in these images from the {camera} security camera. Focus on the actions, behavior, and potential intent of the {label}, rather than just describing its appearance."
  object_prompts:
    person: "Examine the main person in these images. What are they doing and what might their actions suggest about their intent (e.g., approaching a door, leaving an area, standing still)? Do not describe the surroundings or static details."
    car: "Observe the primary vehicle in these images. Focus on its movement, direction, or purpose (e.g., parking, approaching, circling). If it's a delivery vehicle, mention the company."
```

Prompts can also be overridden at the camera level to provide a more detailed prompt to the model about your specific camera, if you desire.

```yaml
cameras:
  front_door:
    objects:
      genai:
        enabled: True
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
