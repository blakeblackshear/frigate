# Birdseye

import ConfigTabs from "@site/src/components/ConfigTabs";
import TabItem from "@theme/TabItem";
import NavPath from "@site/src/components/NavPath";

In addition to Frigate's Live camera dashboard, Birdseye allows a portable heads-up view of your cameras to see what is going on around your property / space without having to watch all cameras that may have nothing happening. Birdseye allows specific modes that intelligently show and disappear based on what you care about.

Birdseye can be viewed by adding the "Birdseye" camera to a Camera Group in the Web UI. Add a Camera Group by pressing the "+" icon on the Live page, and choose "Birdseye" as one of the cameras.

Birdseye can also be used in Home Assistant dashboards, cast to media devices, etc.

## Birdseye Behavior

### Birdseye Modes

Birdseye offers different modes to customize which cameras show under which circumstances.

- **continuous:** All cameras are always included
- **motion:** Cameras that have detected motion within the last 30 seconds are included
- **objects:** Cameras that have tracked an active object within the last 30 seconds are included

### Custom Birdseye Icon

A custom icon can be added to the birdseye background by providing a 180x180 image named `custom.png` inside of the Frigate `media` folder. The file must be a png with the icon as transparent, any non-transparent pixels will be white when displayed in the birdseye view.

### Birdseye view override at camera level

To include a camera in Birdseye view only for specific circumstances, or exclude it entirely, configure Birdseye at the camera level.

<ConfigTabs>
<TabItem value="ui">

**Global settings:** Navigate to <NavPath path="Settings > System > Birdseye" /> to configure the default Birdseye behavior for all cameras.

**Per-camera overrides:** Navigate to <NavPath path="Settings > Camera configuration > Birdseye" /> to override the mode or disable Birdseye for a specific camera.

| Field | Description |
|-------|-------------|
| **Enable Birdseye** | Whether this camera appears in Birdseye view |
| **Tracking mode** | When to show the camera: `continuous`, `motion`, or `objects` |

</TabItem>
<TabItem value="yaml">

```yaml {8-10,12-14}
# Include all cameras by default in Birdseye view
birdseye:
  enabled: True
  mode: continuous

cameras:
  front:
    # Only include the "front" camera in Birdseye view when objects are detected
    birdseye:
      mode: objects
  back:
    # Exclude the "back" camera from Birdseye view
    birdseye:
      enabled: False
```

</TabItem>
</ConfigTabs>

### Birdseye Inactivity

By default birdseye shows all cameras that have had the configured activity in the last 30 seconds. This threshold can be configured.

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > System > Birdseye" />.

| Field | Description |
|-------|-------------|
| **Inactivity threshold** | Seconds of inactivity before a camera is hidden from Birdseye (default: 30) |

</TabItem>
<TabItem value="yaml">

```yaml
birdseye:
  enabled: True
  # highlight-next-line
  inactivity_threshold: 15
```

</TabItem>
</ConfigTabs>

## Birdseye Layout

### Birdseye Dimensions

The resolution and aspect ratio of birdseye can be configured. Resolution will increase the quality but does not affect the layout. Changing the aspect ratio of birdseye does affect how cameras are laid out.

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > System > Birdseye" />.

| Field | Description |
|-------|-------------|
| **Width** | Birdseye output width in pixels (default: 1280) |
| **Height** | Birdseye output height in pixels (default: 720) |

</TabItem>
<TabItem value="yaml">

```yaml
birdseye:
  enabled: True
  width: 1280
  height: 720
```

</TabItem>
</ConfigTabs>

### Sorting cameras in the Birdseye view

It is possible to override the order of cameras that are being shown in the Birdseye view. The order is set at the camera level.

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > Camera configuration > Birdseye" /> for each camera and set the **Position** field to control the display order.

</TabItem>
<TabItem value="yaml">

```yaml
# Include all cameras by default in Birdseye view
birdseye:
  enabled: True
  mode: continuous

cameras:
  front:
    birdseye:
      # highlight-next-line
      order: 1
  back:
    birdseye:
      # highlight-next-line
      order: 2
```

</TabItem>
</ConfigTabs>

_Note_: Cameras are sorted by default using their name to ensure a constant view inside Birdseye.

### Birdseye Cameras

It is possible to limit the number of cameras shown on birdseye at one time. When this is enabled, birdseye will show the cameras with most recent activity. There is a cooldown to ensure that cameras do not switch too frequently.

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > System > Birdseye" />.

| Field | Description |
|-------|-------------|
| **Layout > Max cameras** | Maximum number of cameras shown at once (e.g., `1` for only the most active camera) |

</TabItem>
<TabItem value="yaml">

```yaml {3-4}
birdseye:
  enabled: True
  layout:
    max_cameras: 1
```

</TabItem>
</ConfigTabs>

### Birdseye Scaling

By default birdseye tries to fit 2 cameras in each row and then double in size until a suitable layout is found. The scaling can be configured with a value between 1.0 and 5.0 depending on use case.

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > System > Birdseye" />.

| Field | Description |
|-------|-------------|
| **Layout > Scaling factor** | Camera scaling factor between 1.0 and 5.0 (default: 2.0) |

</TabItem>
<TabItem value="yaml">

```yaml {3-4}
birdseye:
  enabled: True
  layout:
    scaling_factor: 3.0
```

</TabItem>
</ConfigTabs>
