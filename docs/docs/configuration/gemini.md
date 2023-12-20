---
id: gemini
title: Google Gemini Descriptions
---

Google Gemini can be used to automatically generate descriptions based on the thumbnails of your events. This helps with [semantic search](/configuration/semantic_search) in Frigate by providing detailed text descriptions as a basis of the search query. Gemini Pro Vision has a free tier allowing [60 queries per minute](https://ai.google.dev/pricing) to the API, which is more than sufficient for standard Frigate usage.

## Get API Key

To start using Gemini, you must first get an API key from [Google AI Studio](https://makersuite.google.com).

1. Accept the Terms of Service
2. Click "Get API Key" from the right hand navigation
3. Click "Create API key in new project"
4. Copy the API key for use in your config

## Configuration

Because Gemini is an external service that will be receiving thumbnails from Frigate, Gemini can be enabled for all cameras or only for specific cameras.

You may either directly paste the API key in your configuration, or store it in an environment variable prefixed with `FRIGATE_`.

```yaml
gemini: # <- enable Gemini for all cameras
  enabled: True
  api_key: "{FRIGATE_GEMINI_API_KEY}"

cameras:
  front_camera: ...
  indoor_camera:
    gemini: # <- disable Gemini for your indoor camera
      enabled: False
```

### Custom Prompts

Frigate sends both your thumbnail and a prompt to Gemini asking for it to generate a description. The default prompt is as follows:

```
Describe the {label} in this image with as much detail as possible. Do not describe the background.
```

:::tip

Prompts can use variable replacement for `{label}`, `{sub_label}`, and `{camera}` to substitute information from the event as part of the prompt.

:::

You are also able to define custom prompts in your configuration.

```yaml
gemini:
  enabled: True
  api_key: "{FRIGATE_GEMINI_API_KEY}"
  prompt: "Describe the {label} in this image from the {camera} security camera."
  object_prompts:
    person: "Describe the main person in the image (gender, age, clothing, activity, etc). Do not include where the activity is occurring (sidewalk, concrete, driveway, etc). If delivering a package, include the company the package is from."
    car: "Label the primary vehicle in the image with just the name of the company if it is a delivery vehicle, or the color make and model."
```

### Experiment with prompts

[Google AI Studio](https://makersuite.google.com) also has a playground. Download a couple different thumbnails from Frigate and try new things in the playground to get descriptions to your liking before updating the prompt in Frigate.

![Google AI Studio](/img/gemini.png)
