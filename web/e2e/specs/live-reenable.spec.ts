import { test, expect } from "../fixtures/frigate-test";
import { LivePage } from "../pages/live.page";

const CAMERA = "front_door";

test.describe("Live camera re-enable playback @critical @mobile", () => {
  test("re-enabling an opted-in camera restarts live playback without activity", async ({
    frigateApp,
  }) => {
    await frigateApp.api.install({
      config: {
        cameras: {
          [CAMERA]: {
            live: { show_last_frame_when_off: true },
          },
        },
      },
    });
    await frigateApp.goto("/");

    const card = new LivePage(frigateApp.page, !frigateApp.isMobile)
      .cameraCard(CAMERA)
      .first();

    // The mock config has no go2rtc restream, so this camera uses JSMpeg.
    // Keep the camera idle throughout the transition so playback can only
    // restart through the explicit re-enable path.
    frigateApp.ws.sendCameraActivity({
      [CAMERA]: {
        config: { enabled: false },
        motion: false,
        objects: [],
      },
    });

    await expect(card.getByText("Camera is off")).toBeVisible({
      timeout: 5_000,
    });
    await expect(card.locator(".jsmpeg")).toHaveCount(0);

    frigateApp.ws.sendCameraActivity({
      [CAMERA]: {
        config: { enabled: true },
        motion: false,
        objects: [],
      },
    });

    await expect(card.getByText("Camera is off")).toHaveCount(0);
    await expect(card.locator(".jsmpeg")).toHaveCount(1, {
      timeout: 5_000,
    });
  });
});
