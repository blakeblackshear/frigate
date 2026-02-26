---
id: updating
title: Updating
---

# Updating Frigate

The current stable version of Frigate is **0.17.0**. The release notes and any breaking changes for this version can be found on the [Frigate GitHub releases page](https://github.com/blakeblackshear/frigate/releases/tag/v0.17.0).

Keeping Frigate up to date ensures you benefit from the latest features, performance improvements, and bug fixes. The update process varies slightly depending on your installation method (Docker, Home Assistant Addon, etc.). Below are instructions for the most common setups.

## Before You Begin

- **Stop Frigate**: For most methods, you’ll need to stop the running Frigate instance before backing up and updating.
- **Backup Your Configuration**: Always back up your `/config` directory (e.g., `config.yml` and `frigate.db`, the SQLite database) before updating. This ensures you can roll back if something goes wrong.
- **Check Release Notes**: Carefully review the [Frigate GitHub releases page](https://github.com/blakeblackshear/frigate/releases) for breaking changes or configuration updates that might affect your setup.

## Updating with Docker

If you’re running Frigate via Docker (recommended method), follow these steps:

1. **Stop the Container**:
   - If using Docker Compose:
     ```bash
     docker compose down frigate
     ```
   - If using `docker run`:
     ```bash
     docker stop frigate
     ```

2. **Update and Pull the Latest Image**:
   - If using Docker Compose:
     - Edit your `docker-compose.yml` file to specify the desired version tag (e.g., `0.17.0` instead of `0.16.4`). For example:
       ```yaml
       services:
         frigate:
           image: ghcr.io/blakeblackshear/frigate:0.17.0
       ```
     - Then pull the image:
       ```bash
       docker pull ghcr.io/blakeblackshear/frigate:0.17.0
       ```
     - **Note for `stable` Tag Users**: If your `docker-compose.yml` uses the `stable` tag (e.g., `ghcr.io/blakeblackshear/frigate:stable`), you don’t need to update the tag manually. The `stable` tag always points to the latest stable release after pulling.
   - If using `docker run`:
     - Pull the image with the appropriate tag (e.g., `0.17.0`, `0.17.0-tensorrt`, or `stable`):
       ```bash
       docker pull ghcr.io/blakeblackshear/frigate:0.17.0
       ```

3. **Start the Container**:
   - If using Docker Compose:
     ```bash
     docker compose up -d
     ```
   - If using `docker run`, re-run your original command (e.g., from the [Installation](./installation.md#docker) section) with the updated image tag.

4. **Verify the Update**:
   - Check the container logs to ensure Frigate starts successfully:
     ```bash
     docker logs frigate
     ```
   - Visit the Frigate Web UI (default: `http://<your-ip>:5000`) to confirm the new version is running. The version number is displayed at the top of the System Metrics page.

### Notes

- If you’ve customized other settings (e.g., `shm-size`), ensure they’re still appropriate after the update.
- Docker will automatically use the updated image when you restart the container, as long as you pulled the correct version.

## Updating the Home Assistant Addon

For users running Frigate as a Home Assistant Addon:

1. **Check for Updates**:
   - Navigate to **Settings > Add-ons** in Home Assistant.
   - Find your installed Frigate addon (e.g., "Frigate NVR" or "Frigate NVR (Full Access)").
   - If an update is available, you’ll see an "Update" button.

2. **Update the Addon**:
   - Click the "Update" button next to the Frigate addon.
   - Wait for the process to complete. Home Assistant will handle downloading and installing the new version.

3. **Restart the Addon**:
   - After updating, go to the addon’s page and click "Restart" to apply the changes.

4. **Verify the Update**:
   - Check the addon logs (under the "Log" tab) to ensure Frigate starts without errors.
   - Access the Frigate Web UI to confirm the new version is running.

### Notes

- Ensure your `/config/frigate.yml` is compatible with the new version by reviewing the [Release notes](https://github.com/blakeblackshear/frigate/releases).
- If using custom hardware (e.g., Coral or GPU), verify that configurations still work, as addon updates don’t modify your hardware settings.

## Rolling Back

If an update causes issues:

1. Stop Frigate.
2. Restore your backed-up config file and database.
3. Revert to the previous image version:
   - For Docker: Specify an older tag (e.g., `ghcr.io/blakeblackshear/frigate:0.16.4`) in your `docker run` command.
   - For Docker Compose: Edit your `docker-compose.yml`, specify the older version tag (e.g., `ghcr.io/blakeblackshear/frigate:0.16.4`), and re-run `docker compose up -d`.
   - For Home Assistant: Reinstall the previous addon version manually via the repository if needed and restart the addon.
4. Verify the old version is running again.

## Troubleshooting

- **Container Fails to Start**: Check logs (`docker logs frigate`) for errors.
- **UI Not Loading**: Ensure ports (e.g., 5000, 8971) are still mapped correctly and the service is running.
- **Hardware Issues**: Revisit hardware-specific setup (e.g., Coral, GPU) if detection or decoding fails post-update.

Common questions are often answered in the [FAQ](https://github.com/blakeblackshear/frigate/discussions), pinned at the top of the support discussions.
