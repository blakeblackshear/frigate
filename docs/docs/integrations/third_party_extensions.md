---
id: third_party_extensions
title: Third Party Extensions
---

Being open source, others have the possibility to modify and extend the rich functionality Frigate already offers.
This page is meant to be an overview over additions one can make to the home NVR setup. The list is not exhaustive and can be extended via PR to the Frigate docs. Most of these services are designed to interface with Frigate's unauthenticated api over port 5000.

:::warning

This page does not recommend or rate the presented projects.
Please use your own knowledge to assess and vet them before you install anything on your system.

:::

## [Double Take](https://github.com/skrashevich/double-take)

[Double Take](https://github.com/skrashevich/double-take) provides an unified UI and API for processing and training images for facial recognition.
It supports automatically setting the sub labels in Frigate for person objects that are detected and recognized.
This is a fork (with fixed errors and new features) of [original Double Take](https://github.com/jakowenko/double-take) project which, unfortunately, isn't being maintained by author.

## [Frigate telegram](https://github.com/OldTyT/frigate-telegram)

[Frigate telegram](https://github.com/OldTyT/frigate-telegram) makes it possible to send events from Frigate to Telegram. Events are sent as a message with a text description, video, and thumbnail.
