# Dev workflow: frigate-dev (single image with transcode proxy)

Use **frigate-dev** so your working Docker setup keeps using the stable image. You switch between stable and dev by changing the image in compose and restarting. The transcode proxy runs **inside** the Frigate container; there is no separate proxy image.

## Image names

- **frigate-dev** – Frigate image built from this repo (includes transcode proxy, config + UI for transcode_proxy).
- Your normal setup keeps using **ghcr.io/blakeblackshear/frigate:stable-tensorrt** (or whatever you use today).

## Start / stop (switch between stable and dev)

You can’t run both stacks at once (same ports). Use one compose file and swap the image.

**Stop everything:**
```bash
cd ~/docker-compose   # or wherever your compose file is
docker compose down
```

**Run dev stack (Frigate with in-container transcode proxy):**
- In `docker-compose.yml`, set the frigate service to `image: frigate-dev` and publish port 5010 if you use transcode_proxy.
```bash
docker compose up -d
```

**Switch back to stable:**
- Stop: `docker compose down`
- In `docker-compose.yml`, set frigate back to `image: ghcr.io/blakeblackshear/frigate:stable-tensorrt`.
```bash
docker compose up -d
```

**Useful commands:**
- `docker compose down` – stop and remove containers.
- `docker compose up -d` – start in the background.
- `docker compose ps` – see what’s running.
- `docker compose logs -f frigate` – follow Frigate logs.

## Building (Ubuntu server recommended)

Frigate’s image **is not** “just Python” – it has a **compile phase** (nginx, sqlite-vec, etc.). Building is done with Docker and can take a while.

**Where to build:** On the **Ubuntu server** where you run Frigate. That way you get the right architecture and avoid Windows/Linux cross-build issues. Sync the repo from your Windows machine via git (clone or push from Windows to a repo and pull on the server, or copy the repo onto the server).

**On the Ubuntu server:**

1. Clone (or pull) the Frigate repo with this code.
2. **Build Frigate (TensorRT variant, same as stable-tensorrt):**
   ```bash
   cd /path/to/frigate
   make version
   make local-trt
   docker tag frigate:latest-tensorrt frigate-dev
   ```
   (`make local-trt` uses buildx; first time may be slow.) The resulting image includes the transcode proxy; no separate proxy image is built.

**If you prefer to build on Windows:** You can use Docker buildx to build for `linux/amd64` and push to a registry, then pull `frigate-dev` on the Ubuntu server. The Frigate build is heavy and may be slower or more fragile on Windows; building on the server is simpler.

## One-time setup on the server

```bash
# Clone or copy the repo, then:
cd /path/to/frigate
make version
make local-trt
docker tag frigate:latest-tensorrt frigate-dev
```

Then in your compose use `image: frigate-dev`, publish port 5010 if you use the transcode proxy, and set `transcode_proxy` in Frigate config as in the main README.
