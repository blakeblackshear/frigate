---
id: profiles
title: Profiles
---

import ConfigTabs from "@site/src/components/ConfigTabs";
import TabItem from "@theme/TabItem";
import NavPath from "@site/src/components/NavPath";

Profiles allow you to define named sets of camera configuration overrides that can be activated and deactivated at runtime without restarting Frigate. This is useful for scenarios like switching between "Home" and "Away" modes, daytime and nighttime configurations, or any situation where you want to quickly change how multiple cameras behave.

## How Profiles Work

Profiles operate as a two-level system:

1. **Profile definitions** are declared at the top level of your config under `profiles`. Each definition has a machine name (the key) and a `friendly_name` for display in the UI.
2. **Camera profile overrides** are declared under each camera's `profiles` section, keyed by the profile name. Only the settings you want to change need to be specified. Everything else is inherited from the camera's base configuration.

When a profile is activated, Frigate merges each camera's profile overrides on top of its base config. When the profile is deactivated, all cameras revert to their original settings. Only one profile can be active at a time.

:::info

Profile changes are applied in-memory and take effect immediately. No restart is required. The active profile is persisted across Frigate restarts (stored in the `/config/.profiles` file).

:::

## Configuration

The easiest way to define profiles is to use the Frigate UI. Profiles can also be configured manually in your configuration file.

### Creating and Managing Profiles

<ConfigTabs>
<TabItem value="ui">

1. **Create a profile**: Navigate to <NavPath path="Settings > Global configuration > Profiles" />. Click the **Add Profile** button, enter a name (and optionally a profile ID).
2. **Configure overrides**: Navigate to a camera configuration section (e.g. Motion detection, Record, Notifications). In the top right, two buttons will appear - choose a camera and a profile from the profile selector to edit overrides for that camera and section. Only the fields you change will be stored as overrides. Fields that require a restart are hidden since profiles are applied at runtime. You can click the **Remove Profile Override** button to clear overrides.
3. **Activate a profile**: Use the **Profiles** option in Frigate's main menu to choose a profile. Alternatively, in Settings, navigate to <NavPath path="Settings > Global configuration > Profiles" />, then choose a profile in the Active Profile dropdown to activate it. The active profile is also shown in the status bar at the bottom of the screen on desktop browsers.
4. **Delete a profile**: Navigate to <NavPath path="Settings > Global configuration > Profiles" />, then click the trash icon for a profile. This removes the profile definition and all camera overrides associated with it.

</TabItem>
<TabItem value="yaml">

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

</TabItem>
</ConfigTabs>

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

Only the fields you explicitly set in a profile override are applied. All other fields retain their base configuration values. For masks and zones, profile zones **override** the camera's base masks and zones. If configuring profiles via YAML, you should not define masks or zones in profiles that are not defined in the base config.

:::

## Activating Profiles

Profiles can be activated and deactivated via the Frigate UI, [MQTT](/integrations/mqtt#frigateprofileset), or the Home Assistant integration.

In the Frigate UI, open the Settings cog and select **Profiles** from the submenu to see all defined profiles. From there you can activate any profile or deactivate the current one. The active profile is indicated in the UI so you always know which profile is in effect.

Activating or deactivating a profile clears any [runtime toggle overrides](/configuration/live#runtime-toggle-persistence) so the profile's settings aren't silently undone by a stale toggle from before the switch.

## Example: Home / Away Setup

A common use case is having different detection and notification settings based on whether you are home or away. This example below is for a system with two cameras, `front_door` and `indoor_cam`.

<ConfigTabs>
<TabItem value="ui">

1. Navigate to <NavPath path="Settings > Global configuration > Profiles" /> and create two profiles: **Home** and **Away**.
2. From to the Camera configuration section in Settings, choose the **front_door** camera, and select the **Away** profile from the profile dropdown. Then, enable notifications from the Notifications pane, and set alert labels to `person` and `car` from the Review pane. Then, from the profile dropdown choose **Home** profile, then navigate to Notifications to disable notifications.
3. For the **indoor_cam** camera, perform similar steps - configure the **Away** profile to enable the camera, detection, and recording. Configure the **Home** profile to disable the camera entirely for privacy.
4. Activate the desired profile from <NavPath path="Settings > Global configuration > Profiles" /> or from the **Profiles** option in Frigate's main menu.

</TabItem>
<TabItem value="yaml">

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

</TabItem>
</ConfigTabs>

In this example:

- **Away profile**: The front door camera enables notifications and tracks specific alert labels. The indoor camera is fully enabled with detection and recording.
- **Home profile**: The front door camera disables notifications. The indoor camera is completely disabled for privacy.
- **No profile active**: All cameras use their base configuration values.

## FAQ

### Can I define a zone or mask in a profile but not have it in the base config?

No. Profiles are pure overrides. Every zone and mask defined under a profile must reference an entry that already exists on the base camera config. Configurations that introduce profile-only zones or masks are rejected at startup.

If you want a zone or mask to be active only under a specific profile, define it on the base config with `enabled: false`, then enable it in that profile's overrides.

### How do I revert a profile zone or mask override back to the base configuration?

Delete the override. In the Frigate UI, edit the profile and use the "Revert override" action (the trash can icon) on the zone or mask. The base entry is left untouched, and once the override is removed the profile inherits the base values for that zone or mask.

### Can multiple profiles be active at the same time?

No. Only one profile can be active at a time. Activating a new profile automatically deactivates the current one.

### What happens to my profile overrides if I delete a zone or mask from the base?

When you delete a base zone or mask in the Frigate UI, any profile overrides for that entry are deleted automatically as part of the same operation. If you remove a base entry by editing your config file directly and leave a profile override behind, the config will fail validation at startup until the orphaned override is removed as well.

### How do I make a YAML profile track no objects at all?

Set the tracked object list explicitly to an empty list in the profile:

```yaml
cameras:
  front_door:
    profiles:
      home:
        objects:
          track: []
```

Leaving the `objects` section empty (or omitting `track`) does not clear the list. Empty sections set no fields, so the profile inherits the full tracked object list from the base config, including anything set at the global level. The same applies to other lists, such as `audio.listen`.

### Why are some settings missing when I configure a profile override?

Fields that require a Frigate restart to take effect cannot be overridden by profiles, since profiles are applied at runtime without restarting. Those fields are hidden when editing a profile override and can only be changed on the base configuration.

### Can I schedule profiles to be enabled or disabled at certain times?

Not within Frigate itself. Frigate is an NVR, not an automation platform, so it intentionally does not include a scheduler for activating profiles. Instead, activate profiles from an automation platform that already handles time- and event-based triggers well, such as [Home Assistant](https://www.home-assistant.io/) or [Node-RED](https://nodered.org/). These integrate with Frigate and give you far more robust and flexible scheduling than a built-in scheduler could.

If you prefer something lightweight, a simple script driven by a cron job that toggles profiles on a schedule works too.
