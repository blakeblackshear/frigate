import { useResizeObserver } from "@/hooks/resize-observer";
import { useUserPersistence } from "@/hooks/use-user-persistence";
import {
  CSSProperties,
  MutableRefObject,
  PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { isDesktop } from "react-device-detect";

const MOBILE_VIDEO_SPLIT_DEFAULT = 0.5;
const MOBILE_VIDEO_SPLIT_MIN = 0.35;
const MOBILE_VIDEO_SPLIT_MAX = 0.8;

type UseMobileVideoSplitProps = {
  fullscreen: boolean;
  mainLayoutRef: MutableRefObject<HTMLDivElement | null>;
};

type UseMobileVideoSplitReturn = {
  cameraSectionStyle: CSSProperties | undefined;
  isDraggingMobileSplit: boolean;
  onHandlePointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  usePortraitSplitLayout: boolean;
};

export function useMobileVideoSplit({
  fullscreen,
  mainLayoutRef,
}: UseMobileVideoSplitProps): UseMobileVideoSplitReturn {
  const [mobileVideoSplit, setMobileVideoSplit] = useUserPersistence<number>(
    "recordingMobileVideoSplit",
    MOBILE_VIDEO_SPLIT_DEFAULT,
  );
  const [isDraggingMobileSplit, setIsDraggingMobileSplit] = useState(false);
  const [{ width: mainLayoutWidth, height: mainLayoutHeight }] =
    useResizeObserver(mainLayoutRef);

  const usePortraitSplitLayout = useMemo(
    () => !isDesktop && !fullscreen && mainLayoutHeight > mainLayoutWidth,
    [fullscreen, mainLayoutHeight, mainLayoutWidth],
  );
  const mobileVideoSplitSafe = useMemo(
    () =>
      Math.min(
        MOBILE_VIDEO_SPLIT_MAX,
        Math.max(
          MOBILE_VIDEO_SPLIT_MIN,
          mobileVideoSplit ?? MOBILE_VIDEO_SPLIT_DEFAULT,
        ),
      ),
    [mobileVideoSplit],
  );

  const updateMobileSplitFromClientY = useCallback(
    (clientY: number) => {
      if (!mainLayoutRef.current || !usePortraitSplitLayout) {
        return;
      }

      const rect = mainLayoutRef.current.getBoundingClientRect();
      if (rect.height <= 0) {
        return;
      }

      const split = (clientY - rect.top) / rect.height;
      const clampedSplit = Math.min(
        MOBILE_VIDEO_SPLIT_MAX,
        Math.max(MOBILE_VIDEO_SPLIT_MIN, split),
      );
      setMobileVideoSplit(clampedSplit);
    },
    [usePortraitSplitLayout, mainLayoutRef, setMobileVideoSplit],
  );

  const onHandlePointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (!usePortraitSplitLayout) {
        return;
      }

      event.preventDefault();
      setIsDraggingMobileSplit(true);
      updateMobileSplitFromClientY(event.clientY);
    },
    [usePortraitSplitLayout, updateMobileSplitFromClientY],
  );

  useEffect(() => {
    if (!isDraggingMobileSplit) {
      return;
    }

    const onPointerMove = (event: globalThis.PointerEvent) => {
      updateMobileSplitFromClientY(event.clientY);
    };

    const onPointerUp = () => {
      setIsDraggingMobileSplit(false);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [isDraggingMobileSplit, updateMobileSplitFromClientY]);

  const cameraSectionStyle = useMemo(
    () =>
      usePortraitSplitLayout
        ? { height: `${Math.round(mobileVideoSplitSafe * 100)}%` }
        : undefined,
    [usePortraitSplitLayout, mobileVideoSplitSafe],
  );

  return {
    cameraSectionStyle,
    isDraggingMobileSplit,
    onHandlePointerDown,
    usePortraitSplitLayout,
  };
}
