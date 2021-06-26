---
id: home-assistant
title: Integration with Home Assistant
sidebar_label: Home Assistant
---

The best way to integrate with Home Assistant is to use the [official integration](https://github.com/blakeblackshear/frigate-hass-integration).

## Installation

Available via HACS as a [custom repository](https://hacs.xyz/docs/faq/custom_repositories). To install:

   * Add the custom repository:

```
Home Assistant > HACS > Integrations > [...] > Custom Repositories
```

| Key            | Value                                                       |
| -------------- | ----------------------------------------------------------- |
| Repository URL | https://github.com/blakeblackshear/frigate-hass-integration |
| Category       | Integration                                                 |

   * Use [HACS](https://hacs.xyz/) to install the integration:
```
Home Assistant > HACS > Integrations > "Explore & Add Integrations" > Frigate
```
   * Restart Home Assistant.
   * Then add/configure the integration:
```
Home Assistant > Configuration > Integrations > Add Integration > Frigate
```

Note: You will also need
[media_source](https://www.home-assistant.io/integrations/media_source/) enabled
in your Home Assistant configuration for the Media Browser to appear.

## Configuration

When configuring the integration, you will be asked for the following parameters:


| Variable | Description                                                                                                                                                                                                                                                                                                                                                                      |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| URL      | The `URL` of your frigate instance, the URL you use to access Frigate in the browser. This may look like `http://<host>:5000/`. If you are using HassOS with the addon, the URL should be `http://ccab4aaf-frigate:5000` (or `http://ccab4aaf-frigate-beta:5000` if your are using the beta version of the addon). Live streams required port 1935, see [RTMP streams](#streams) |

<a name="options"></a>
## Options

```
Home Assistant > Configuration > Integrations > Frigate > Options
```

| Option            | Description                                                                                                                                                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RTMP URL Template | A [jinja2](https://jinja.palletsprojects.com/) template that is used to override the standard RTMP stream URL (e.g. for use with reverse proxies). This option is only shown to users who have [advanced mode](https://www.home-assistant.io/blog/2019/07/17/release-96/#advanced-mode) enabled. See [RTMP streams](#streams) below. |

## Entities Provided

| Platform        | Description                                                                       |
| --------------- | --------------------------------------------------------------------------------- |
| `camera`        | Live camera stream (requires RTMP), camera for image of the last detected object. |
| `sensor`        | States to monitor Frigate performance, object counts for all zones and cameras.   |
| `switch`        | Switch entities to toggle detection, clips and snapshots.                         |
| `binary_sensor` | A "motion" binary sensor entity per camera/zone/object.                           |

## Media Browser Support

The integration provides:

- Rich UI with thumbnails for browsing event clips
- Rich UI for browsing 24/7 recordings by month, day, camera, time

This is accessible via "Media Browser" on the left menu panel in Home Assistant.

<a name="api"></a>
## API

- Notification API with public facing endpoints for images in notifications

### Notifications

Frigate publishes event information in the form of a change feed via MQTT. This
allows lots of customization for notifications to meet your needs. Event changes
are published with `before` and `after` information as shown
[here](#frigateevents). Note that some people may not want to expose frigate to
the web, so you can leverage the HA API that frigate custom_integration ties
into (which is exposed to the web, and thus can be used for mobile notifications
etc):

To load an image taken by frigate from Home Assistants API see below:

```
https://HA_URL/api/frigate/notifications/<event-id>/thumbnail.jpg
```

To load a video clip taken by frigate from Home Assistants API :

```
https://HA_URL/api/frigate/notifications/<event-id>/<camera>/clip.mp4
```

Here is a simple example of a notification automation of events which will update the existing notification for each change. This means the image you see in the notification will update as frigate finds a "better" image.

```yaml
automation:
  - alias: Notify of events
    trigger:
      platform: mqtt
      topic: frigate/events
    action:
      - service: notify.mobile_app_pixel_3
        data_template:
          message: 'A {{trigger.payload_json["after"]["label"]}} was detected.'
          data:
            image: 'https://your.public.hass.address.com/api/frigate/notifications/{{trigger.payload_json["after"]["id"]}}/thumbnail.jpg?format=android'
            tag: '{{trigger.payload_json["after"]["id"]}}'
```

```yaml
automation:
  - alias: When a person enters a zone named yard
    trigger:
      platform: mqtt
      topic: frigate/events
    condition:
      - "{{ trigger.payload_json['after']['label'] == 'person' }}"
      - "{{ 'yard' in trigger.payload_json['after']['entered_zones'] }}"
    action:
      - service: notify.mobile_app_pixel_3
        data_template:
          message: "A {{trigger.payload_json['after']['label']}} has entered the yard."
          data:
            image: "https://url.com/api/frigate/notifications/{{trigger.payload_json['after']['id']}}/thumbnail.jpg"
            tag: "{{trigger.payload_json['after']['id']}}"
```

```yaml
- alias: When a person leaves a zone named yard
  trigger:
    platform: mqtt
    topic: frigate/events
  condition:
    - "{{ trigger.payload_json['after']['label'] == 'person' }}"
    - "{{ 'yard' in trigger.payload_json['before']['current_zones'] }}"
    - "{{ not 'yard' in trigger.payload_json['after']['current_zones'] }}"
  action:
    - service: notify.mobile_app_pixel_3
      data_template:
        message: "A {{trigger.payload_json['after']['label']}} has left the yard."
        data:
          image: "https://url.com/api/frigate/notifications/{{trigger.payload_json['after']['id']}}/thumbnail.jpg"
          tag: "{{trigger.payload_json['after']['id']}}"
```

```yaml
- alias: Notify for dogs in the front with a high top score
  trigger:
    platform: mqtt
    topic: frigate/events
  condition:
    - "{{ trigger.payload_json['after']['label'] == 'dog' }}"
    - "{{ trigger.payload_json['after']['camera'] == 'front' }}"
    - "{{ trigger.payload_json['after']['top_score'] > 0.98 }}"
  action:
    - service: notify.mobile_app_pixel_3
      data_template:
        message: "High confidence dog detection."
        data:
          image: "https://url.com/api/frigate/notifications/{{trigger.payload_json['after']['id']}}/thumbnail.jpg"
          tag: "{{trigger.payload_json['after']['id']}}"
```

If you are using telegram, you can fetch the image directly from Frigate:

```yaml
automation:
  - alias: Notify of events
    trigger:
      platform: mqtt
      topic: frigate/events
    action:
      - service: notify.telegram_full
        data_template:
          message: 'A {{trigger.payload_json["after"]["label"]}} was detected.'
          data:
            photo:
              # this url should work for addon users
              - url: 'http://ccab4aaf-frigate:5000/api/events/{{trigger.payload_json["after"]["id"]}}/thumbnail.jpg'
                caption: 'A {{trigger.payload_json["after"]["label"]}} was detected on {{ trigger.payload_json["after"]["camera"] }} camera'
```

<a name="streams"></a>
## RTMP stream

In order for the live streams to function they need to be accessible on the RTMP
port (default: `1935`) at `<frigatehost>:1935`. Home Assistant will directly
connect to that streaming port when the live camera is viewed.

#### RTMP URL Template

For advanced usecases, this behavior can be changed with the [RTMP URL
template](#options) option. When set, this string will override the default stream
address that is derived from the default behavior described above. This option supports
[jinja2 templates](https://jinja.palletsprojects.com/) and has the `camera` dict
variables from [Frigate API](https://blakeblackshear.github.io/frigate/usage/api#apiconfig)
available for the template. Note that no Home Assistant state is available to the
template, only the camera dict from Frigate.

This is potentially useful when Frigate is behind a reverse proxy, and/or when
the default stream port is otherwise not accessible to Home Assistant (e.g.
firewall rules).

###### RTMP URL Template Examples

Use a different port number:

```
rtmp://<frigate_host>:2000/live/front_door
```

Use the camera name in the stream URL:

```
rtmp://<frigate_host>:2000/live/{{ name }}
```

Use the camera name in the stream URL, converting it to lowercase first:

```
rtmp://<frigate_host>:2000/live/{{ name|lower }}
```

## Multiple Instance Support

The Frigate integration seamlessly supports the use of multiple Frigate servers. 

### Requirements for Multiple Instances

In order for multiple Frigate instances to function correctly, the
`topic_prefix` and `client_id` parameters must be set differently per server.
See [MQTT
configuration](https://blakeblackshear.github.io/frigate/configuration/index#mqtt)
for how to set these.

#### API URLs

When multiple Frigate instances are configured, [API](#api) URLs should include an
identifier to tell Home Assistant which Frigate instance to refer to. The
identifier used is the MQTT `client_id` paremeter included in the configuration,
and is used like so:

```
https://HA_URL/api/frigate/<client-id>/notifications/<event-id>/thumbnail.jpg
```

```
https://HA_URL/api/frigate/<client-id>/clips/front_door-1624599978.427826-976jaa.mp4
```

#### Default Treatment

When a single Frigate instance is configured, the `client-id` parameter need not
be specified in URLs/identifiers -- that single instance is assumed. When
multiple Frigate instances are configured, the user **must** explicitly specify
which server they are referring to.