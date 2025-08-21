---
id: genai_review
title: Review Summaries
---

Generative AI can be used to automatically generate structured summaries of review items. These summaries will show up in Frigate's native notifications as well as in the UI. Generative AI can also be used to take a collection of summaries over a period of time and provide a report, which may be useful to get a quick report of everything that happened while out for some amount of time.

Requests for a summary are requested automatically to your AI provider for alert review items when the activity has ended, they can also be optionally enabled for detections as well.

Generative AI review summaries can also be toggled dynamically for a camera via MQTT with the topic `frigate/<camera_name>/review_descriptions/set`. See the [MQTT documentation](/integrations/mqtt/#frigatecamera_namereviewdescriptionsset).

## Review Summary Usage and Best Practices

Review summaries provide structured JSON responses that are saved for each review item:

```
- `scene` (string): A full description including setting, entities, actions, and any plausible supported inferences.
- `confidence` (float): 0-1 confidence in the analysis.
- `other_concerns` (list): List of user-defined concerns that may need additional investigation.
- `potential_threat_level` (integer): 0, 1, or 2 as defined below.

Threat-level definitions:
- 0 — Typical or expected activity for this location/time (includes residents, guests, or known animals engaged in normal activities, even if they glance around or scan surroundings).
- 1 — Unusual or suspicious activity: At least one security-relevant behavior is present **and not explainable by a normal residential activity**.
- 2 — Active or immediate threat: Breaking in, vandalism, aggression, weapon display.
```

This will show in the UI as a list of concerns that each review item has along with the general description.

### Additional Concerns

Along with the concern of suspicious activity or immediate threat, you may have concerns such as animals in your garden or a gate being left open. These concerns can be configured so that the review summaries will make note of them if the activity requires additional review. For example:

```yaml
review:
  genai:
    enabled: true
    additional_concerns:
      - animals in the garden
```

## Review Reports

Along with individual review item summaries, Generative AI provides the ability to request a report of a given time period. For example, you can get a daily report while on a vacation of any suspicious activity or other concerns that may require review.