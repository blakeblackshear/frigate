---
id: contributing
title: Contributing
---

## Getting the source

### Core, Web, Docker, and Documentation

This repository holds the main Frigate application and all of its dependencies.

Fork [blakeblackshear/frigate](https://github.com/blakeblackshear/frigate.git) to your own GitHub profile, then clone the forked repo to your local machine.

From here, follow the guides for:

- [Core](#core)
- [Web Interface](#web-interface)
- [Documentation](#documentation)

### Frigate Home Assistant Addon

This repository holds the Home Assistant Addon, for use with Home Assistant OS and compatible installations. It is the piece that allows you to run Frigate from your Home Assistant Supervisor tab.

Fork [blakeblackshear/frigate-hass-addons](https://github.com/blakeblackshear/frigate-hass-addons) to your own Github profile, then clone the forked repo to your local machine.

### Frigate Home Assistant Integration

This repository holds the custom integration that allows your Home Assistant installation to automatically create entities for your Frigate instance, whether you run that with the [addon](#frigate-home-assistant-addon) or in a separate Docker instance.

Fork [blakeblackshear/frigate-hass-integration](https://github.com/blakeblackshear/frigate-hass-integration) to your own GitHub profile, then clone the forked repo to your local machine.

## Core

### Prerequisites

- [Frigate source code](#frigate-core-web-and-docs)
- GNU make
- Docker
- Extra Coral device (optional, but very helpful to simulate real world performance)

### Setup

#### 1. Build the docker container locally with the appropriate make command

For x86 machines, use `make amd64_frigate`

#### 2. Create a local config file for testing

Place the file at `config/config.yml` in the root of the repo.

Here is an example, but modify for your needs:

```yaml
mqtt:
  host: mqtt

cameras:
  test:
    ffmpeg:
      inputs:
        - path: /media/frigate/car-stopping.mp4
          input_args: -re -stream_loop -1 -fflags +genpts
          roles:
            - detect
            - rtmp
            - clips
    height: 1080
    width: 1920
    fps: 5
```

These input args tell ffmpeg to read the mp4 file in an infinite loop. You can use any valid ffmpeg input here.

#### 3. Gather some mp4 files for testing

Create and place these files in a `debug` folder in the root of the repo. This is also where clips and recordings will be created if you enable them in your test config. Update your config from step 2 above to point at the right file. You can check the `docker-compose.yml` file in the repo to see how the volumes are mapped.

#### 4. Open the repo with Visual Studio Code

Upon opening, you should be prompted to open the project in a remote container. This will build a container on top of the base frigate container with all the development dependencies installed. This ensures everyone uses a consistent development environment without the need to install any dependencies on your host machine.

#### 5. Run frigate from the command line

VSCode will start the docker compose file for you and open a terminal window connected to `frigate-dev`.

- Run `python3 -m frigate` to start the backend.
- In a separate terminal window inside VS Code, change into the `web` directory and run `npm install && npm start` to start the frontend.

#### 6. Teardown

After closing VSCode, you may still have containers running. To close everything down, just run `docker-compose down -v` to cleanup all containers.

## Web Interface

### Prerequisites

- [Frigate source code](#frigate-core-web-and-docs)
- All [core](#core) prerequisites _or_ another running Frigate instance locally available
- Node.js 14

### Making changes

#### 1. Set up a Frigate instance

The Web UI requires an instance of Frigate to interact with for all of its data. You can either run an instance locally (recommended) or attach to a separate instance accessible on your network.

To run the local instance, follow the [core](#core) development instructions.

If you won't be making any changes to the Frigate HTTP API, you can attach the web development server to any Frigate instance on your network. Skip this step and go to [3a](#3a-run-the-development-server-against-a-non-local-instance).

#### 2. Install dependencies

```console
cd web && npm install
```

#### 3. Run the development server

```console
cd web && npm run start
```

#### 3a. Run the development server against a non-local instance

To run the development server against a non-local instance, you will need to provide an environment variable, `SNOWPACK_PUBLIC_API_HOST` that tells the web application how to connect to the Frigate API:

```console
cd web && SNOWPACK_PUBLIC_API_HOST=http://<ip-address-to-your-frigate-instance>:5000 npm run start
```

#### 4. Making changes

The Web UI is built using [Snowpack](https://www.snowpack.dev/), [Preact](https://preactjs.com), and [Tailwind CSS](https://tailwindcss.com).

Light guidelines and advice:

- Avoid adding more dependencies. The web UI intends to be lightweight and fast to load.
- Do not make large sweeping changes. [Open a discussion on GitHub](https://github.com/blakeblackshear/frigate/discussions/new) for any large or architectural ideas.
- Ensure `lint` passes. This command will ensure basic conformance to styles, applying as many automatic fixes as possible, including Prettier formatting.

```console
npm run lint
```

- Add to unit tests and ensure they pass. As much as possible, you should strive to _increase_ test coverage whenever making changes. This will help ensure features do not accidentally become broken in the future.

```console
npm run test
```

- Test in different browsers. Firefox, Chrome, and Safari all have different quirks that make them unique targets to interact with.

## Documentation

### Prerequisites

- [Frigate source code](#frigate-core-web-and-docs)
- Node.js 14

### Making changes

#### 1. Installation

```console
npm install
```

#### 2. Local Development

```console
npm run start
```

This command starts a local development server and open up a browser window. Most changes are reflected live without having to restart the server.

The docs are built using [Docusaurus v2](https://v2.docusaurus.io). Please refer to the Docusaurus docs for more information on how to modify Frigate's documentation.

#### 3. Build (optional)

```console
npm run build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.
