export const CAMERA_ZOOM_MIN_SCALE = 1;
export const CAMERA_ZOOM_MAX_SCALE = 8;
// Tuning constant for discrete shift+wheel zoom on grid cards.
export const CAMERA_ZOOM_SHIFT_WHEEL_STEP = 0.1;

export type CameraZoomRuntimeTransform = {
  scale: number;
  positionX: number;
  positionY: number;
};

export type CameraZoomDimensions = {
  viewportWidth: number;
  viewportHeight: number;
  contentWidth: number;
  contentHeight: number;
};

export type CameraZoomPersistedState = {
  /**
   * Scale normalized to a [0, 1] range between min and max zoom.
   */
  normalizedScale: number;
  /**
   * Relative content x-coordinate (0..1) that should map to the viewport center.
   */
  focusX: number;
  /**
   * Relative content y-coordinate (0..1) that should map to the viewport center.
   */
  focusY: number;
};

export function isCameraZoomPersistedState(
  value: unknown,
): value is CameraZoomPersistedState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<CameraZoomPersistedState>;
  return (
    typeof candidate.normalizedScale === "number" &&
    Number.isFinite(candidate.normalizedScale) &&
    typeof candidate.focusX === "number" &&
    Number.isFinite(candidate.focusX) &&
    typeof candidate.focusY === "number" &&
    Number.isFinite(candidate.focusY)
  );
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampScale(
  scale: number,
  minScale: number = CAMERA_ZOOM_MIN_SCALE,
  maxScale: number = CAMERA_ZOOM_MAX_SCALE,
): number {
  return clamp(scale, minScale, maxScale);
}

export function normalizeMinScaleTransform(
  transform: CameraZoomRuntimeTransform,
  minScale: number = CAMERA_ZOOM_MIN_SCALE,
): CameraZoomRuntimeTransform {
  if (transform.scale <= minScale) {
    return {
      scale: minScale,
      positionX: 0,
      positionY: 0,
    };
  }

  return transform;
}

export function normalizeScale(
  scale: number,
  minScale: number = CAMERA_ZOOM_MIN_SCALE,
  maxScale: number = CAMERA_ZOOM_MAX_SCALE,
): number {
  if (maxScale <= minScale) {
    return 0;
  }

  return clamp(
    (clampScale(scale, minScale, maxScale) - minScale) / (maxScale - minScale),
    0,
    1,
  );
}

export function denormalizeScale(
  normalizedScale: number,
  minScale: number = CAMERA_ZOOM_MIN_SCALE,
  maxScale: number = CAMERA_ZOOM_MAX_SCALE,
): number {
  if (maxScale <= minScale) {
    return minScale;
  }

  const normalized = clamp(normalizedScale, 0, 1);
  return minScale + normalized * (maxScale - minScale);
}

/**
 * Calculates a new pan position to keep the content under the cursor fixed
 * while changing scale.
 */
export function getCursorRelativeZoomTransform(
  current: CameraZoomRuntimeTransform,
  targetScale: number,
  cursorX: number,
  cursorY: number,
  minScale: number = CAMERA_ZOOM_MIN_SCALE,
  maxScale: number = CAMERA_ZOOM_MAX_SCALE,
): CameraZoomRuntimeTransform {
  const nextScale = clampScale(targetScale, minScale, maxScale);
  const safeCurrentScale =
    Number.isFinite(current.scale) && current.scale > 0
      ? current.scale
      : CAMERA_ZOOM_MIN_SCALE;
  const contentX = (cursorX - current.positionX) / safeCurrentScale;
  const contentY = (cursorY - current.positionY) / safeCurrentScale;

  return normalizeMinScaleTransform(
    {
      scale: nextScale,
      positionX: cursorX - contentX * nextScale,
      positionY: cursorY - contentY * nextScale,
    },
    minScale,
  );
}

export function toPersistedCameraZoomState(
  runtime: CameraZoomRuntimeTransform,
  dimensions: CameraZoomDimensions,
  minScale: number = CAMERA_ZOOM_MIN_SCALE,
  maxScale: number = CAMERA_ZOOM_MAX_SCALE,
): CameraZoomPersistedState {
  const normalizedRuntime = normalizeMinScaleTransform(runtime, minScale);
  const safeContentWidth = dimensions.contentWidth || 1;
  const safeContentHeight = dimensions.contentHeight || 1;
  const safeScale =
    Number.isFinite(normalizedRuntime.scale) && normalizedRuntime.scale > 0
      ? normalizedRuntime.scale
      : CAMERA_ZOOM_MIN_SCALE;
  const centerContentX =
    (dimensions.viewportWidth / 2 - normalizedRuntime.positionX) / safeScale;
  const centerContentY =
    (dimensions.viewportHeight / 2 - normalizedRuntime.positionY) / safeScale;

  return {
    normalizedScale: normalizeScale(
      normalizedRuntime.scale,
      minScale,
      maxScale,
    ),
    focusX: clamp(centerContentX / safeContentWidth, 0, 1),
    focusY: clamp(centerContentY / safeContentHeight, 0, 1),
  };
}

export function fromPersistedCameraZoomState(
  persisted: CameraZoomPersistedState,
  dimensions: CameraZoomDimensions,
  minScale: number = CAMERA_ZOOM_MIN_SCALE,
  maxScale: number = CAMERA_ZOOM_MAX_SCALE,
): CameraZoomRuntimeTransform {
  const scale = denormalizeScale(persisted.normalizedScale, minScale, maxScale);
  const safeContentWidth = dimensions.contentWidth || 1;
  const safeContentHeight = dimensions.contentHeight || 1;
  const contentX = clamp(persisted.focusX, 0, 1) * safeContentWidth;
  const contentY = clamp(persisted.focusY, 0, 1) * safeContentHeight;

  return normalizeMinScaleTransform(
    {
      scale,
      positionX: dimensions.viewportWidth / 2 - contentX * scale,
      positionY: dimensions.viewportHeight / 2 - contentY * scale,
    },
    minScale,
  );
}

export function getNextScaleFromWheelDelta(
  currentScale: number,
  wheelDeltaY: number,
  step: number = CAMERA_ZOOM_SHIFT_WHEEL_STEP,
  minScale: number = CAMERA_ZOOM_MIN_SCALE,
  maxScale: number = CAMERA_ZOOM_MAX_SCALE,
): number {
  if (wheelDeltaY === 0) {
    return clampScale(currentScale, minScale, maxScale);
  }

  const direction = wheelDeltaY > 0 ? -1 : 1;
  return clampScale(currentScale + direction * step, minScale, maxScale);
}

export function getCameraZoomStorageKey(cameraName: string): string {
  return `live:grid-card:zoom:${cameraName}`;
}

export function loadPersistedCameraZoomState(
  cameraName: string,
): CameraZoomPersistedState | undefined {
  const serialized = localStorage.getItem(getCameraZoomStorageKey(cameraName));

  if (!serialized) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(serialized);
    return isCameraZoomPersistedState(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function savePersistedCameraZoomState(
  cameraName: string,
  state: CameraZoomPersistedState,
): void {
  localStorage.setItem(
    getCameraZoomStorageKey(cameraName),
    JSON.stringify(state),
  );
}
