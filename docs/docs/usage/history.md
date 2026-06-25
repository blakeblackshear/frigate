---
id: history
title: History
---

import NavPath from "@site/src/components/NavPath";

**History** is Frigate's full-resolution recording viewer. Unlike Live, Review, and Explore, there is no menu item for it — you reach it from within another view, then scrub the timeline, switch cameras, inspect a tracked object's lifecycle, and export or share any moment.

This page describes how to _use_ the History view. For how recordings are _configured_ (retention, pre/post capture), see [Recording](/configuration/record).

## Opening History

You can open History from several places:

- **From [Review](/usage/review):** clicking a review item opens its recording, scrubbed to just before the activity on that camera.
- **From [Live](/usage/live):** the **History** button in a camera's single-camera view opens that camera about 30 seconds in the past.
- **From a share link:** opening a shared timestamp link (see [Share Timestamp](#the-actions-menu) below) jumps straight to that camera and moment.

Use the **Back** button to return where you came from, or the **Live** button to jump to the current camera's live view.

:::tip

If you see **"No recordings found for this time"**, the most common causes are: recording was not enabled for that camera at the time of the event; the retention window has since expired and those segments were removed; or storage ran low and Frigate deleted them early to free space. See [Recording](/configuration/record) to verify your retention settings.

:::

## Timeline, Events, and Detail

A toggle (a drawer on mobile) switches the side panel between three modes:

- **Timeline** — a scrubbable vertical timeline of the selected camera. Horizontal lines down the center represent motion, with longer lines indicating more motion at that moment. Review items are marked as shaded areas (**red** for alerts, **orange** for detections), and sections with no colored background are times when no recording exists.
- **Events** — a scrollable list of the camera's review items for the time range; clicking one seeks the player to it.
- **Detail** — the [tracking details inspector](#the-detail-view) for the objects in view.

While you are selecting a range to export, the panel temporarily switches to Timeline.

## Scrubbing and previews

Drag the timeline handlebar to move through time; the main player and any secondary camera previews scrub together so everything stays in sync. Press the zoom buttons on the timeline to change its zoom level (from coarse to fine segments). Sections of the timeline with no recordings are shown as gaps.

On desktop, when more than one camera is available, a **row of secondary previews** shows the other cameras at the same moment. Clicking one of them makes it the main camera at the current timestamp, so you can follow activity across cameras without losing your place. On mobile, use the camera drawer to switch cameras.

## Filtering and the calendar

You can filter History by **cameras** and **date**. The calendar behaves the same as it does in [Review](/usage/review#filtering-and-the-calendar): an **underline** under a day means recordings exist for that day, and a **colored dot** (red for unreviewed alerts, orange for unreviewed detections) marks days with unreviewed activity.

## The Detail view

The **Detail** mode turns the side panel into a tracking details inspector. It lists one card per review item, each showing the item's severity, start time, the object labels involved, a count of tracked objects, and the duration. The active card is highlighted as the video plays, and clicking a card seeks to it.

Expanding a card reveals the **lifecycle** of each tracked object — a row for each significant moment (detected, entered a zone, became active, became stationary, left, and so on), with a progress line that follows the current playback position. Hovering a row shows that moment's score, ratio, and area, and clicking a row seeks the video to that exact timestamp.

The **Detail View Settings** at the bottom let you toggle whether the active item's objects expand automatically, and adjust the **annotation offset** — a fine timing correction that aligns the bounding-box overlays with the recorded video when your camera's snapshot and recording timestamps drift. Admins can save the offset to the camera's configuration.

## The Actions menu

On desktop, the **Actions** menu (the film icon) collects the things you can do with the footage you are viewing:

- **Export** — save a clip of a chosen time range so it is never removed by retention. The dialog pre-selects the last hour; adjust the range or drag the timeline handles, then export. See [Exports](/usage/exports) for managing and downloading exports.
- **Share Timestamp** — generate a link to the current moment (or a custom timestamp) to share with another Frigate user. This is an internal link, not a public share URL.
- **Motion Search** — scan this camera's recordings for changes in a region you draw. This is the same tool documented under [Reviewing Motion](/usage/review#motion-search).
- **Debug Replay** (admins) — replay a recorded range back through Frigate's detection pipeline to see how it would be processed.

You can also capture an instant snapshot of the current frame, and submit a frame to [Frigate+](/integrations/plus) directly from the player (admins only).

## AI review summaries

When [Generative AI review](/configuration/genai/genai_review) is configured, Frigate can generate a title, description, and threat classification for review items and surface them as you scrub through History. A review item that has an AI summary exposes its details in a few places:

- **Over the video** — when the item is on screen, a popup appears over the player.
- **In the Events side panel** — items with a summary show the title below the thumbnail.
- **In the Detail side panel** — the item's card shows the title alongside its tracking details.

Clicking any of these opens the **AI Analysis** dialog with the generated detail and any flagged concerns for that item.
