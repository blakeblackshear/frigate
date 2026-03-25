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
  isMobilePortraitStacked: boolean;
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

  const isMobilePortraitStacked = useMemo(
    () => !isDesktop && mainLayoutHeight > mainLayoutWidth,
    [mainLayoutHeight, mainLayoutWidth],
  );
  const usePortraitSplitLayout = isMobilePortraitStacked && !fullscreen;
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
      if (!mainLayoutRef.current || !isMobilePortraitStacked) {
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
    [isMobilePortraitStacked, mainLayoutRef, setMobileVideoSplit],
  );

  const onHandlePointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (!isMobilePortraitStacked) {
        return;
      }

      event.preventDefault();
      setIsDraggingMobileSplit(true);
      updateMobileSplitFromClientY(event.clientY);
    },
    [isMobilePortraitStacked, updateMobileSplitFromClientY],
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
      isMobilePortraitStacked
        ? { height: `${Math.round(mobileVideoSplitSafe * 100)}%` }
        : undefined,
    [isMobilePortraitStacked, mobileVideoSplitSafe],
  );

  return {
    cameraSectionStyle,
    isDraggingMobileSplit,
    isMobilePortraitStacked,
    onHandlePointerDown,
    usePortraitSplitLayout,
  };
}
