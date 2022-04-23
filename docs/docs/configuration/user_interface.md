---
id: user_interface
title: User Interface Configurations
---

### Experimental UI

While developing and testing new components, users may decide to opt-in to test potential new features on the front-end.

```yaml
ui:
  use_experimental: true
```

Note that experimental changes may contain bugs or may be removed at any time in future releases of the software. Use of these features are presented as-is and with no functional guarantee.

### Configuration options

Set to true if you'd like to hide configuration options within the frontend. Not recommended while setting up Frigate.

```yaml
ui:
  hide_configuration_options: false
```
