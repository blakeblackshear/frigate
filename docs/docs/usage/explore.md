---
id: explore
title: Explore
---

import NavPath from "@site/src/components/NavPath";

**Explore** is where you browse and search every **tracked object** Frigate has saved. By default it groups recent objects by label; when [Semantic Search](/configuration/semantic_search) is enabled, you can also search by natural-language description or visual similarity. Selecting any object opens a detail pane with its snapshot, lifecycle, and metadata.

This page describes how to _use_ the Explore view. For how the underlying features are _configured_, see [Semantic Search](/configuration/semantic_search) and [Generative AI descriptions](/configuration/genai/genai_objects).

## Browsing tracked objects

The default view shows your most recent tracked objects grouped into rows by label — _Person_, _Car_, _Dog_, and so on — each row labeled with the object type and a count. The arrow at the end of a row opens the full, filterable grid for that label.

Clicking a thumbnail opens its [detail dialog](#tracked-object-details); right-clicking or long-pressing a thumbnail opens an [actions menu](#actions-and-bulk-selection). You can switch to a denser grid layout and adjust the number of columns from the view's settings.

## Searching

When [Semantic Search](/configuration/semantic_search) is enabled, a search bar appears that combines two things in one input:

- **Natural-language search** — type a free-text query and press Enter to run a semantic search over your tracked objects.
- **Filter tokens** — type a `key:` to get suggestions, then a value, to add a structured filter. Each filter becomes a removable chip, and you can chain several together.

You can save a search with the star icon and reload it later, and clear everything with the clear-search icon. A help popover explains the token syntax, for example:

```
cameras:front_door label:person before:01012024 time_range:3:00PM-4:00PM
```

### Filter reference

The most common filter tokens are:

| Filter                       | Description                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| **Cameras**                  | Limit to one or more cameras.                                                      |
| **Labels**                   | Object labels (person, car, etc.).                                                 |
| **Sub Labels**               | Recognized sub labels (e.g. a recognized face or name).                            |
| **Attributes**               | Classification attributes applied to the object.                                   |
| **Recognized License Plate** | Match a recognized plate.                                                          |
| **Zones**                    | Objects that entered specific zones.                                               |
| **Before / After**           | Restrict to a date range.                                                          |
| **Time Range**               | Restrict to a time of day (`HH:MM-HH:MM`).                                         |
| **Min / Max Score**          | Restrict by the object's confidence score.                                         |
| **Min / Max Speed**          | Restrict by estimated speed (when speed estimation is configured).                 |
| **Has Snapshot / Has Clip**  | Only objects that saved a snapshot or recording.                                   |
| **Submitted to Frigate+**    | Only objects already submitted (when Frigate+ is enabled).                         |
| **Search Type**              | Whether semantic search matches the object's **Thumbnail** or its **Description**. |

### Sorting

When a filter or search is active, a **Sort** control lets you order results by **date**, **object score**, or **estimated speed** (ascending or descending). When a semantic query or similarity search is active, results can also be ordered by **relevance**.

### Thumbnail and description search

- The **Search Type** setting controls whether a text query is matched against each object's **thumbnail** or its **description**. Each result indicates which one it matched and the confidence.

Natural-language search, thumbnail search, and description search all require [Semantic Search](/configuration/semantic_search) to be enabled.

## Tracked Object Details

Selecting an object opens the **Tracked Object Details** dialog. Use the arrows (or the left/right keys) to step to the previous or next object. The dialog has two tabs:

- **Snapshot** or **Thumbnail** — the saved snapshot (or thumbnail).
- **Tracking Details** — the object's lifecycle, available when the object has a recording. It lists each significant moment (detected, entered a zone, became active or stationary, left, and so on); clicking a moment plays that part of the recording with the bounding box overlaid. A settings popover lets you show all zones and adjust the annotation offset.

The details pane shows the object's **label**, **scores**, **camera**, **timestamp**, estimated **speed**, any **recognized license plate** and **classification attributes**, and its **description**. Admins can edit the sub label, license plate, and attributes inline.

The **description** can be edited by hand, and — when [Generative AI descriptions](/configuration/genai/genai_objects) are enabled and the object's lifecycle has ended — regenerated from the snapshot or from thumbnails. For `speech` objects, a **Transcribe** action is available when audio transcription is enabled. When [Frigate+](/integrations/plus) is enabled, admins can submit a snapshot to improve their model directly from this pane.

## Actions and bulk selection

Right-clicking or long-pressing an object (in the grid or its thumbnail) opens an actions menu with options to **download** the video, snapshot, or a clean snapshot; **view tracking details**; **find similar**; **add a trigger**; **view in History**; and **delete the tracked object**.

:::note

Deleting a tracked object removes its snapshot, embeddings, and tracking-details entries, but the recorded footage of that object in [History](/usage/history) is **not** deleted.

:::

To act on many objects at once, Ctrl/Cmd-click or right-click to start a selection (selected tiles gain a blue ring), then use the toolbar to select all, clear the selection, or delete (admins).

## Semantic Search - Usage and best practices

1. Semantic Search is used in conjunction with the other filters available on the Explore page. Use a combination of traditional filtering and Semantic Search for the best results.
2. Use the thumbnail search type when searching for particular objects in the scene. Use the description search type when attempting to discern the intent of your object.
3. Because of how the AI models Frigate uses have been trained, the comparison between text and image embedding distances generally means that with multi-modal (`thumbnail` and `description`) searches, results matching `description` will appear first, even if a `thumbnail` embedding may be a better match. Play with the "Search Type" setting to help find what you are looking for. Note that if you are generating descriptions for specific objects or zones only, this may cause search results to prioritize the objects with descriptions even if the the ones without them are more relevant.
4. Make your search language and tone closely match exactly what you're looking for. If you are using thumbnail search, **phrase your query as an image caption**. Searching for "red car" may not work as well as "red sedan driving down a residential street on a sunny day".
5. Semantic search on thumbnails tends to return better results when matching large subjects that take up most of the frame. Small things like "cat" tend to not work well.
6. Experiment! Find a tracked object you want to test and start typing keywords and phrases to see what works for you.

## Triggers

From an object's actions menu, **Add trigger** sets up a per-camera trigger that uses Semantic Search to automate an action (a notification, sub label, or attribute) whenever a similar object appears. Triggers require Semantic Search and are managed under <NavPath path="Settings > Enrichments > Triggers" />. See [Triggers](/configuration/semantic_search#triggers) for full configuration and best practices.
