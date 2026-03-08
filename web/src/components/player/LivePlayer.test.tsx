import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import LivePlayer from "./LivePlayer";
import { CameraConfig } from "@/types/frigateConfig";

vi.mock("@/hooks/resize-observer", () => ({
  useResizeObserver: () => [{ width: 300, height: 200 }],
}));

vi.mock("@/hooks/use-camera-activity", () => ({
  useCameraActivity: () => ({
    enabled: true,
    activeMotion: true,
    activeTracking: false,
    objects: [],
    offline: false,
  }),
}));

vi.mock("@/hooks/use-camera-friendly-name", () => ({
  useCameraFriendlyName: () => "Front Door",
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  Trans: ({ children }: { children: string }) => children,
  initReactI18next: { type: "3rdParty", init: () => undefined },
}));

vi.mock("@/utils/i18n", () => ({
  getTranslatedLabel: (value: string) => value,
}));

vi.mock("./WebRTCPlayer", () => ({
  default: ({ className }: { className?: string }) => (
    <video className={className}>webrtc</video>
  ),
}));

vi.mock("./MsePlayer", () => ({
  default: ({ className }: { className?: string }) => (
    <video className={className}>mse</video>
  ),
}));

vi.mock("./JSMpegPlayer", () => ({
  default: ({ className }: { className?: string }) => (
    <div className={className}>jsmpeg</div>
  ),
}));

vi.mock("../camera/AutoUpdatingCameraImage", () => ({
  default: () => <div>still</div>,
}));

vi.mock("../overlay/ImageShadowOverlay", () => ({
  ImageShadowOverlay: () => <div />,
}));

vi.mock("./PlayerStats", () => ({
  PlayerStats: () => <div />,
}));

const cameraConfig = {
  name: "front_door",
  detect: { width: 1920, height: 1080 },
} as CameraConfig;

describe("LivePlayer dashboard transform gating", () => {
  it("does not apply rotate transform when applyDashboardTransforms is false", () => {
    const html = renderToStaticMarkup(
      <LivePlayer
        cameraConfig={cameraConfig}
        streamName="front_door"
        preferredLiveMode="webrtc"
        useWebGL={false}
        playInBackground={false}
        rotateClockwise
        fillContainer
        applyDashboardTransforms={false}
      />,
    );

    expect(html).not.toContain("rotate(90deg)");
  });

  it("applies rotate transform when dashboard transforms are enabled", () => {
    const html = renderToStaticMarkup(
      <LivePlayer
        cameraConfig={cameraConfig}
        streamName="front_door"
        preferredLiveMode="webrtc"
        useWebGL={false}
        playInBackground={false}
        rotateClockwise
        fillContainer
        applyDashboardTransforms
      />,
    );

    expect(html).toContain("rotate(90deg)");
  });
});
