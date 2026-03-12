---
id: profiles
title: Profiles
---

Profiles allow you to define named sets of camera configuration overrides that can be activated and deactivated at runtime without restarting Frigate. This is useful for scenarios like switching between "Home" and "Away" modes, daytime and nighttime configurations, or any situation where you want to quickly change how multiple cameras behave.

## How Profiles Work

Profiles operate as a two-level system:

1. **Profile definitions** are declared at the top level of your config under `profiles`. Each definition has a machine name (the key) and a `friendly_name` for display in the UI.
2. **Camera profile overrides** are declared under each camera's `profiles` section, keyed by the profile name. Only the settings you want to change need to be specified — everything else is inherited from the camera's base configuration.

When a profile is activated, Frigate merges each camera's profile overrides on top of its base config. When the profile is deactivated, all cameras revert to their original settings. Only one profile can be active at a time.

:::info

Profile changes are applied in-memory and take effect immediately — no restart is required. The active profile is persisted across Frigate restarts (stored in the `/config/.active_profile` file).

:::

## Configuration

The easiest way to define profiles is to use the Frigate UI. Profiles can also be configured manually in your configuration file.

### Defining Profiles

First, define your profiles at the top level of your Frigate config. Every profile name referenced by a camera must be defined here.

```yaml
profiles:
  home:
    friendly_name: Home
  away:
    friendly_name: Away
  night:
    friendly_name: Night Mode
```

### Camera Profile Overrides

Under each camera, add a `profiles` section with overrides for each profile. You only need to include the settings you want to change.

```yaml
cameras:
  front_door:
    ffmpeg:
      inputs:
        - path: rtsp://camera:554/stream
          roles:
            - detect
            - record
    detect:
      enabled: true
    record:
      enabled: true
    profiles:
      away:
        detect:
          enabled: true
        notifications:
          enabled: true
        objects:
          track:
            - person
            - car
            - package
        review:
          alerts:
            labels:
              - person
              - car
              - package
      home:
        detect:
          enabled: true
        notifications:
          enabled: false
        objects:
          track:
            - person
```

### Supported Override Sections

The following camera configuration sections can be overridden in a profile:

| Section            | Description                               |
| ------------------ | ----------------------------------------- |
| `enabled`          | Enable or disable the camera entirely     |
| `audio`            | Audio detection settings                  |
| `birdseye`         | Birdseye view settings                    |
| `detect`           | Object detection settings                 |
| `face_recognition` | Face recognition settings                 |
| `lpr`              | License plate recognition settings        |
| `motion`           | Motion detection settings                 |
| `notifications`    | Notification settings                     |
| `objects`          | Object tracking and filter settings       |
| `record`           | Recording settings                        |
| `review`           | Review alert and detection settings       |
| `snapshots`        | Snapshot settings                         |
| `zones`            | Zone definitions (merged with base zones) |

:::note

Only the fields you explicitly set in a profile override are applied. All other fields retain their base configuration values. For zones, profile zones are merged with the camera's base zones — any zone defined in the profile will override or add to the base zones.

:::

## Activating Profiles

Profiles can be activated and deactivated from the Frigate UI. Open the Settings cog and select **Profiles** from the submenu to see all defined profiles. From there you can activate any profile or deactivate the current one. The active profile is indicated in the UI so you always know which profile is in effect.

## Example: Home / Away Setup

A common use case is having different detection and notification settings based on whether you are home or away.

```yaml
profiles:
  home:
    friendly_name: Home
  away:
    friendly_name: Away

cameras:
  front_door:
    ffmpeg:
      inputs:
        - path: rtsp://camera:554/stream
          roles:
            - detect
            - record
    detect:
      enabled: true
    record:
      enabled: true
    notifications:
      enabled: false
    profiles:
      away:
        notifications:
          enabled: true
        review:
          alerts:
            labels:
              - person
              - car
      home:
        notifications:
          enabled: false

  indoor_cam:
    ffmpeg:
      inputs:
        - path: rtsp://camera:554/indoor
          roles:
            - detect
            - record
    detect:
      enabled: false
    record:
      enabled: false
    profiles:
      away:
        enabled: true
        detect:
          enabled: true
        record:
          enabled: true
      home:
        enabled: false
```

In this example:

- **Away profile**: The front door camera enables notifications and tracks specific alert labels. The indoor camera is fully enabled with detection and recording.
- **Home profile**: The front door camera disables notifications. The indoor camera is completely disabled for privacy.
- **No profile active**: All cameras use their base configuration values.
