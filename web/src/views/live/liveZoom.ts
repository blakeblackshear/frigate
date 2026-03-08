import { type CSSProperties } from "react";
import { ReactZoomPanPinchProps } from "react-zoom-pan-pinch";

export type LiveZoomMode = "player" | "debug";

export type LiveZoomWrapperProps = Pick<
  ReactZoomPanPinchProps,
  "minScale" | "wheel" | "disabled"
>;

export type LiveZoomTransformStyles = {
  wrapperStyle: CSSProperties;
  contentStyle: CSSProperties;
};

export const LIVE_ZOOM_WHEEL_CONFIG: NonNullable<
  ReactZoomPanPinchProps["wheel"]
> = {
  smoothStep: 0.005,
};

const LIVE_ZOOM_TRANSFORM_STYLES: Record<LiveZoomMode, LiveZoomTransformStyles> =
  {
    player: {
      wrapperStyle: {
        width: "100%",
        height: "100%",
      },
      contentStyle: {
        position: "relative",
        width: "100%",
        height: "100%",
        padding: "8px",
      },
    },
    debug: {
      wrapperStyle: {
        width: "100%",
        height: "100%",
      },
      contentStyle: {
        position: "relative",
        width: "100%",
        height: "100%",
      },
    },
  };

export function createLiveZoomWrapperProps(disabled: boolean): LiveZoomWrapperProps {
  return {
    minScale: 1,
    wheel: LIVE_ZOOM_WHEEL_CONFIG,
    disabled,
  };
}

export function getLiveZoomTransformStyles(
  mode: LiveZoomMode,
): LiveZoomTransformStyles {
  return LIVE_ZOOM_TRANSFORM_STYLES[mode];
}
