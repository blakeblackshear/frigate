---
id: contributing-boards
title: Community Supported Boards
---

## About Community Supported Boards

There are many SBCs (small board computers) that have a passionate community behind them, Jetson Nano for example. These SBCs often have dedicated hardware that can greatly accelerate Frigate's AI and video workloads, but this hardware requires very specific frameworks for interfacing with it.

This means it would be very difficult for Frigate's maintainers to support these different boards especially given the relatively low userbase.

The community support boards framework allows a user in the community to be the codeowner to add support for an SBC or other detector by providing the code, maintenance, and user support.

## Getting Started

1. Follow the steps from [the main contributing docs](/development/contributing.md).
2. Create a new build type under `docker/build`
3. Create a Dockerfile and use `BASE_IMAGE` as the base, `docker/build/rpi/Dockerfile` can be used as an example for this.
4. Create install_deps.sh to install any deps needed for the device.
