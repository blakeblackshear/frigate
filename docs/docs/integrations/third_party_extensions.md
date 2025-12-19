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

## [Advanced Camera Card (formerly known as Frigate Card](https://card.camera/#/README)

The [Advanced Camera Card](https://card.camera/#/README) is a Home Assistant dashboard card with deep Frigate integration.

## [Double Take](https://github.com/skrashevich/double-take)

[Double Take](https://github.com/skrashevich/double-take) provides an unified UI and API for processing and training images for facial recognition.
It supports automatically setting the sub labels in Frigate for person objects that are detected and recognized.
This is a fork (with fixed errors and new features) of [original Double Take](https://github.com/jakowenko/double-take) project which, unfortunately, isn't being maintained by author.

## [Frigate Notify](https://github.com/0x2142/frigate-notify)

[Frigate Notify](https://github.com/0x2142/frigate-notify) is a simple app designed to send notifications from Frigate to your favorite platforms. Intended to be used with standalone Frigate installations - Home Assistant not required, MQTT is optional but recommended.

## [Frigate Snap-Sync](https://github.com/thequantumphysicist/frigate-snap-sync/)

[Frigate Snap-Sync](https://github.com/thequantumphysicist/frigate-snap-sync/) is a program that works in tandem with Frigate. It responds to Frigate when a snapshot or a review is made (and more can be added), and uploads them to one or more remote server(s) of your choice.

## [Frigate telegram](https://github.com/OldTyT/frigate-telegram)

[Frigate telegram](https://github.com/OldTyT/frigate-telegram) makes it possible to send events from Frigate to Telegram. Events are sent as a message with a text description, video, and thumbnail.

## [Periscope](https://github.com/maksz42/periscope)

[Periscope](https://github.com/maksz42/periscope) is a lightweight Android app that turns old devices into live viewers for Frigate. It works on Android 2.2 and above, including Android TV. It supports authentication and HTTPS.

## [Scrypted - Frigate bridge plugin](https://github.com/apocaliss92/scrypted-frigate-bridge)

[Scrypted - Frigate bridge](https://github.com/apocaliss92/scrypted-frigate-bridge) is an plugin that allows to ingest Frigate detections, motion, videoclips on Scrypted as well as provide templates to export rebroadcast configurations on Frigate.
