import { type CSSProperties } from "react";
import { ReactZoomPanPinchProps } from "react-zoom-pan-pinch";

export type LiveZoomMode = "player" | "debug";

export type LiveZoomWrapperProps = Pick<
  ReactZoomPanPinchProps,
  "minScale" | "maxScale" | "wheel" | "disabled"
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

export const LIVE_ZOOM_SHIFT_WHEEL_STEP = 0.1;
export const LIVE_ZOOM_MIN_SCALE = 1;
export const LIVE_ZOOM_MAX_SCALE = 5;

type LiveZoomTransformState = {
  positionX: number;
  positionY: number;
  scale: number;
};

type LiveZoomPoint = {
  x: number;
  y: number;
};

export function getCursorRelativeZoomTransform(
  transformState: LiveZoomTransformState,
  cursorPoint: LiveZoomPoint,
  nextScale: number,
): LiveZoomTransformState {
  const scaleRatio = nextScale / transformState.scale;

  return {
    scale: nextScale,
    positionX:
      cursorPoint.x - (cursorPoint.x - transformState.positionX) * scaleRatio,
    positionY:
      cursorPoint.y - (cursorPoint.y - transformState.positionY) * scaleRatio,
  };
}

const LIVE_ZOOM_TRANSFORM_STYLES: Record<
  LiveZoomMode,
  LiveZoomTransformStyles
> = {
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

export function createLiveZoomWrapperProps(
  disabled: boolean,
): LiveZoomWrapperProps {
  return {
    minScale: LIVE_ZOOM_MIN_SCALE,
    maxScale: LIVE_ZOOM_MAX_SCALE,
    wheel: {
      ...LIVE_ZOOM_WHEEL_CONFIG,
      disabled: true,
    },
    disabled,
  };
}

export function getLiveZoomTransformStyles(
  mode: LiveZoomMode,
): LiveZoomTransformStyles {
  return LIVE_ZOOM_TRANSFORM_STYLES[mode];
}
