/**
 * WebSocket mock using Playwright's native page.routeWebSocket().
 *
 * Intercepts the app's WebSocket connection and simulates the Frigate
 * WS protocol: onConnect handshake, camera_activity expansion, and
 * topic-based state updates.
 */

import type { Page, WebSocketRoute } from "@playwright/test";
import { cameraActivityPayload } from "../fixtures/mock-data/camera-activity";

export class WsMocker {
  private mockWs: WebSocketRoute | null = null;
  private cameras: string[];

  constructor(cameras: string[] = ["front_door", "backyard", "garage"]) {
    this.cameras = cameras;
  }

  async install(page: Page) {
    await page.routeWebSocket("**/ws", (ws) => {
      this.mockWs = ws;

      ws.onMessage((msg) => {
        this.handleClientMessage(msg.toString());
      });
    });
  }

  private handleClientMessage(raw: string) {
    let data: { topic: string; payload?: unknown; message?: string };
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }

    if (data.topic === "onConnect") {
      // Send initial camera_activity state
      this.sendCameraActivity();

      // Send initial stats
      this.send(
        "stats",
        JSON.stringify({
          cameras: Object.fromEntries(
            this.cameras.map((c) => [
              c,
              {
                camera_fps: 5,
                detection_fps: 5,
                process_fps: 5,
                skipped_fps: 0,
                detection_enabled: 1,
                connection_quality: "excellent",
              },
            ]),
          ),
          service: {
            last_updated: Date.now() / 1000,
            uptime: 86400,
            version: "0.15.0-test",
            latest_version: "0.15.0",
            storage: {},
          },
          detectors: {},
          cpu_usages: {},
          gpu_usages: {},
          camera_fps: 15,
          process_fps: 15,
          skipped_fps: 0,
          detection_fps: 15,
        }),
      );
    }

    // Echo back state commands (e.g., modelState, jobState, etc.)
    if (data.topic === "modelState") {
      this.send("model_state", JSON.stringify({}));
    }
    if (data.topic === "embeddingsReindexProgress") {
      // Send a completed reindex state so Explore renders when
      // semantic_search.enabled is true. A null payload leaves the page
      // in a permanent loading spinner because !reindexState is truthy.
      this.send(
        "embeddings_reindex_progress",
        JSON.stringify({
          status: "completed",
          processed_objects: 0,
          total_objects: 0,
          thumbnails: 0,
          descriptions: 0,
          time_remaining: null,
        }),
      );
    }
    if (data.topic === "birdseyeLayout") {
      this.send("birdseye_layout", JSON.stringify(null));
    }
    if (data.topic === "jobState") {
      this.send("job_state", JSON.stringify({}));
    }
    if (data.topic === "audioTranscriptionState") {
      this.send("audio_transcription_state", JSON.stringify("idle"));
    }

    // Camera toggle commands: echo back the new state
    const toggleMatch = data.topic?.match(
      /^(.+)\/(detect|recordings|snapshots|audio|enabled|notifications|ptz_autotracker|review_alerts|review_detections|object_descriptions|review_descriptions|audio_transcription)\/set$/,
    );
    if (toggleMatch) {
      const [, camera, feature] = toggleMatch;
      this.send(`${camera}/${feature}/state`, data.payload);
    }
  }

  /** Send a raw WS message to the app */
  send(topic: string, payload: unknown) {
    if (!this.mockWs) return;
    this.mockWs.send(JSON.stringify({ topic, payload }));
  }

  /** Send camera_activity with default or custom state */
  sendCameraActivity(overrides?: Parameters<typeof cameraActivityPayload>[1]) {
    const payload = cameraActivityPayload(this.cameras, overrides);
    this.send("camera_activity", payload);
  }

  /** Send a review update */
  sendReview(review: unknown) {
    this.send("reviews", JSON.stringify(review));
  }

  /** Send an event update */
  sendEvent(event: unknown) {
    this.send("events", JSON.stringify(event));
  }
}
