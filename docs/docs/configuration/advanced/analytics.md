---
id: analytics
title: Anonymous Analytics
---

import AnalyticsFields from "@site/src/components/AnalyticsFields";
import NavPath from "@site/src/components/NavPath";

Frigate can send one anonymous usage report a day. The reports show the maintainers which hardware to support, which features people use, and how releases perform. Sharing is off until you turn it on.

## Turning it on

Enable **Share anonymous analytics** at <NavPath path="Settings > System > Telemetry" />, or set it in your config:

```yaml
telemetry:
  analytics: true
```

The same page has a **Preview the report** button that shows exactly what the next report contains.

## How it's sent

- Once a day, as a JSON POST to `https://analytics.frigate.video/report`
- The server looks up your country and region from your IP address and never stores the address
- Raw reports are kept for 60 days; only aggregate totals are published
- A random install ID, stored in `/config/.analytics.json`, keeps your install from being counted twice. Turning sharing off deletes it

## What's never sent

- Camera, zone, group, profile, or user names
- Object labels, face names, or license plate text
- IP addresses, hostnames, URLs, or stream paths
- Credentials or API keys
- Events, recordings, or anything from them

## Every field

Fields marked public appear in the published totals. The machine-readable schema is [frigate-analytics-schema.json](pathname:///frigate-analytics-schema.json).

<AnalyticsFields />
