---
id: genai_config
title: Configuring Generative AI
---

## Configuration

A Generative AI provider can be configured in the global config, which will make the Generative AI features available for use. There are currently 3 native providers available to integrate with Frigate. Other providers that support the OpenAI standard API can also be used. See the OpenAI section below.

To use Generative AI, you must define a single provider at the global level of your Frigate configuration. If the provider you choose requires an API key, you may either directly paste it in your configuration, or store it in an environment variable prefixed with `FRIGATE_`.

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

You must use a vision capable model with Frigate. Current model variants can be found [in their model library](https://ollama.com/library). Note that Frigate will not automatically download the model you specify in your config, Ollama will try to download the model but it may take longer than the timeout, it is recommended to pull the model beforehand by running `ollama pull your_model` on your Ollama server/Docker container. Note that the model specified in Frigate's config must match the downloaded model tag.

:::info

Each model is available in multiple parameter sizes (3b, 4b, 8b, etc.). Larger sizes are more capable of complex tasks and understanding of situations, but requires more memory and computational resources. It is recommended to try multiple models and experiment to see which performs best.

:::

:::tip

If you are trying to use a single model for Frigate and HomeAssistant, it will need to support vision and tools calling. qwen3-VL supports vision and tools simultaneously in Ollama.

:::

The following models are recommended:

| Model         | Notes                                                                |
| ------------- | -------------------------------------------------------------------- |
| `qwen3-vl`    | Strong visual and situational understanding, higher vram requirement |
| `Intern3.5VL` | Relatively fast with good vision comprehension                       |
| `gemma3`      | Strong frame-to-frame understanding, slower inference times          |
| `qwen2.5-vl`  | Fast but capable model with good vision comprehension                |

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

Google Gemini has a [free tier](https://ai.google.dev/pricing) for the API, however the limits may not be sufficient for standard Frigate usage. Choose a plan appropriate for your installation.

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
  model: gemini-2.5-flash
```

:::note

To use a different Gemini-compatible API endpoint, set the `provider_options` with the `base_url` key to your provider's API URL. For example:

```
genai:
  provider: gemini
  ...
  provider_options:
    base_url: https://...
```

Other HTTP options are available, see the [python-genai documentation](https://github.com/googleapis/python-genai).

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

:::tip

For OpenAI-compatible servers (such as llama.cpp) that don't expose the configured context size in the API response, you can manually specify the context size in `provider_options`:

```yaml
genai:
  provider: openai
  base_url: http://your-llama-server
  model: your-model-name
  provider_options:
    context_size: 8192 # Specify the configured context size
```

This ensures Frigate uses the correct context window size when generating prompts.

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
