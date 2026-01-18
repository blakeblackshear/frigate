---
id: genai_objects
title: Object Descriptions
---

Generative AI can be used to automatically generate descriptive text based on the thumbnails of your tracked objects. This helps with [Semantic Search](/configuration/semantic_search) in Frigate to provide more context about your tracked objects. Descriptions are accessed via the _Explore_ view in the Frigate UI by clicking on a tracked object's thumbnail.

Requests for a description are sent off automatically to your AI provider at the end of the tracked object's lifecycle, or can optionally be sent earlier after a number of significantly changed frames, for example in use in more real-time notifications. Descriptions can also be regenerated manually via the Frigate UI. Note that if you are manually entering a description for tracked objects prior to its end, this will be overwritten by the generated response.

By default, descriptions will be generated for all tracked objects and all zones. But you can also optionally specify `objects` and `required_zones` to only generate descriptions for certain tracked objects or zones.

Optionally, you can generate the description using a snapshot (if enabled) by setting `use_snapshot` to `True`. By default, this is set to `False`, which sends the uncompressed images from the `detect` stream collected over the object's lifetime to the model. Once the object lifecycle ends, only a single compressed and cropped thumbnail is saved with the tracked object. Using a snapshot might be useful when you want to _regenerate_ a tracked object's description as it will provide the AI with a higher-quality image (typically downscaled by the AI itself) than the cropped/compressed thumbnail. Using a snapshot otherwise has a trade-off in that only a single image is sent to your provider, which will limit the model's ability to determine object movement or direction.

Generative AI object descriptions can also be toggled dynamically for a camera via MQTT with the topic `frigate/<camera_name>/object_descriptions/set`. See the [MQTT documentation](/integrations/mqtt#frigatecamera_nameobject_descriptionsset).

## Usage and Best Practices

Frigate's thumbnail search excels at identifying specific details about tracked objects – for example, using an "image caption" approach to find a "person wearing a yellow vest," "a white dog running across the lawn," or "a red car on a residential street." To enhance this further, Frigate’s default prompts are designed to ask your AI provider about the intent behind the object's actions, rather than just describing its appearance.

While generating simple descriptions of detected objects is useful, understanding intent provides a deeper layer of insight. Instead of just recognizing "what" is in a scene, Frigate’s default prompts aim to infer "why" it might be there or "what" it could do next. Descriptions tell you what’s happening, but intent gives context. For instance, a person walking toward a door might seem like a visitor, but if they’re moving quickly after hours, you can infer a potential break-in attempt. Detecting a person loitering near a door at night can trigger an alert sooner than simply noting "a person standing by the door," helping you respond based on the situation’s context.

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
  genai:
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