---
id: genai_review
title: Review Summaries
---

Generative AI can be used to automatically generate structured summaries of review items. These summaries will show up in Frigate's native notifications as well as in the UI. Generative AI can also be used to take a collection of summaries over a period of time and provide a report, which may be useful to get a quick report of everything that happened while out for some amount of time.

Requests for a summary are requested automatically to your AI provider for alert review items when the activity has ended, they can also be optionally enabled for detections as well.

Generative AI review summaries can also be toggled dynamically for a [camera via MQTT](/integrations/mqtt/#frigatecamera_namereviewdescriptionsset).

## Review Summary Usage and Best Practices

Review summaries provide structured JSON responses that are saved for each review item:

```
- `title` (string): A concise, one-sentence title that captures the main activity.
- `scene` (string): A narrative description of what happens across the sequence from start to finish, including setting, detected objects, and their observable actions.
- `confidence` (float): 0-1 confidence in the analysis. Higher confidence when objects/actions are clearly visible and context is unambiguous.
- `other_concerns` (list): List of user-defined concerns that may need additional investigation.
- `potential_threat_level` (integer): 0, 1, or 2 as defined below.

Threat-level definitions:
- 0 — **Normal activity**: The observable activity matches Normal Activity Indicators (brief vehicle access, deliveries, known people, pet activity, services). Very short sequences (under 15 seconds) during normal hours (6 AM - 11 PM) with apparent purpose (vehicle access, deliveries, passing through) are Level 0. Brief activities are generally normal.
- 1 — **Potentially suspicious**: The observable activity matches Suspicious Activity Indicators (testing access, stealing items, climbing barriers, lingering throughout most of sequence without task, unusual hours 11 PM - 5 AM with suspicious behavior). Requires clear suspicious actions visible in frames, not just ambiguity or brief presence.
- 2 — **Immediate threat**: Clear evidence of active criminal activity, forced entry, break-in, vandalism, aggression, weapons, theft in progress, or property damage.
```

This will show in the UI as a list of concerns that each review item has along with the general description.

### Defining Typical Activity

Each installation and even camera can have different parameters for what is considered suspicious activity. Frigate allows the `activity_context_prompt` to be defined globally and at the camera level, which allows you to define more specifically what should be considered normal activity. It is important that this is not overly specific as it can sway the output of the response.

<details>
  <summary>Default Activity Context Prompt</summary>

```
### Normal Activity Indicators (Level 0)
- Known/verified people in any zone
- People with pets in residential areas
- Brief activity near vehicles: approaching vehicles, brief standing, then leaving or entering vehicle (unloading, loading, checking something). Very short sequences (under 15 seconds) of vehicle access during typical hours (6 AM - 10 PM) are almost always normal.
- Deliveries or services: brief approach to doors/porches, standing briefly, placing or retrieving items, then leaving
- Access to private areas: entering back yards, garages, or homes (with or without visible purpose in frame)
- Brief movement through semi-public areas (driveways, front yards) with items or approaching structure/vehicle
- Activity on public areas only (sidewalks, streets) without entering property
- Services/maintenance workers with tools, uniforms, or vehicles

### Suspicious Activity Indicators (Level 1)
- Testing or attempting to open doors/windows on vehicles or buildings
- Taking items that don't belong to them (stealing packages, objects from porches/driveways)
- Climbing or jumping fences/barriers to access property
- Attempting to conceal actions or items from view
- Prolonged presence without purpose: remaining in same area (near vehicles, private zones) throughout most/all of the sequence without clear activity or task. Brief stops (a few seconds of standing) are normal; sustained presence (most of the duration) without interaction is concerning.
- Activity at unusual hours (11 PM - 5 AM) combined with suspicious behavior patterns. Normal commute/daytime hours (6 AM - 6 PM) do not increase suspicion by themselves.

### Critical Threat Indicators (Level 2)
- Holding break-in tools (crowbars, pry bars, bolt cutters)
- Weapons visible (guns, knives, bats used aggressively)
- Forced entry in progress
- Physical aggression or violence
- Active property damage or theft

### Assessment Guidance
**Default to Level 0** for brief activity during normal hours. When evaluating, first check if it matches Normal Activity Indicators. Very short sequences (under 15 seconds) of vehicle access, deliveries, or movement through property during typical hours (6 AM - 11 PM) should be Level 0 unless there are clear suspicious actions visible (testing doors, stealing, climbing barriers).

Only assign Level 1 if the activity shows clear suspicious behaviors: testing access points, stealing items, lingering throughout most of the sequence without task, climbing barriers, or other explicit violations. Brief activity with apparent purpose (approaching vehicle, delivery, passing through) is Level 0.

Consider duration, time, zone, and actions holistically. Brief is normal; sustained suspicious behavior is concerning.
```

</details>

### Image Source

By default, review summaries use preview images (cached preview frames) which have a lower resolution but use fewer tokens per image. For better image quality and more detailed analysis, you can configure Frigate to extract frames directly from recordings at a higher resolution:

```yaml
review:
  genai:
    enabled: true
    image_source: recordings # Options: "preview" (default) or "recordings"
```

When using `recordings`, frames are extracted at 480p resolution (480px height), providing better detail for the LLM while being mindful of context window size. This is particularly useful for scenarios where fine details matter, such as identifying license plates, reading text, or analyzing distant objects. Note that using recordings will:

- Provide higher quality images to the LLM (480p vs 180p preview images)
- Use more tokens per image (~200-300 tokens vs ~100 tokens for preview)
- Result in fewer frames being sent to stay within context limits (typically 6-12 frames vs 8-20 frames)
- Require that recordings are enabled for the camera

If recordings are not available for a given time period, the system will automatically fall back to using preview frames.

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
