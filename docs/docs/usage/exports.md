---
id: exports
title: Exports
---

**Exports** are how you keep a specific piece of footage permanently.

Frigate's recordings are governed by your [retention settings](/configuration/record): once footage ages past its retention window (or, depending on your configuration, once it is only kept where motion, alerts, or detections occurred), it is deleted to free up disk space. An **export** saves a copy of a chosen time range to a separate location that is **never removed by retention**, so it stays available until you delete it yourself.

This is the answer to the common question _"how do I stop Frigate from deleting an important clip?"_ Instead of increasing retention for an entire camera (which uses far more storage to protect a single moment), export just the footage you want to keep.

:::tip

Exports are stored under `/media/frigate/exports`, separate from your recordings, and are not counted against or removed by recording retention. They remain on disk until you delete them, so be aware that they accumulate over time.

:::

## Creating an export

There are a few ways to create an export:

- **From Review**: select (right click or long-press) an individual review item directly, and choose Export from the header menu. You can also select multiple review items and export them all at once, optionally grouping them into a [case](#cases).
- **From History**: open the **Actions** menu and choose **Export**. You can export a preset duration (the last 1, 4, 8, 12, or 24 hours), enter a custom start and end time, or select a range directly on the timeline. A **multi-camera** option lets you export the same time range across several cameras at once.

In every case you can give the export a name. Frigate then saves the footage from your recordings as a single video file. Larger ranges take time to process; the export is marked _in progress_ until it finishes, and you can keep using Frigate while it runs.

## Managing exports

All of your exports live on the **Exports** page, reachable from the main navigation, where you can search for one by name. Each export offers the following actions:

- **Play** it in the browser,
- **Download** it to save the footage outside of Frigate,
- **Share** it: copies a direct link to the export (or uses your device's share sheet),
- **Rename** it, and
- **Delete** it: deleting is the only way an export is removed.

You can also select multiple exports at once to **delete** them in bulk, or to **add them to** (or **remove them from**) a [case](#cases).

## Cases

A **case** groups related exports together: for example, all the clips from a single incident across multiple cameras. On the **Exports** page you can create a case with a name and description, add existing exports to it (or create a new case while exporting), and **download the entire case as a single archive** to hand off as one package.

Exports that don't belong to a case appear under **Uncategorized Exports**. Deleting a case lets you either keep its exports (they move back to uncategorized) or delete them along with the case.
