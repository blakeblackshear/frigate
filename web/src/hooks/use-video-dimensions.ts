import { useState, useMemo } from "react";
import { useResizeObserver } from "./resize-observer";

export type VideoResolutionType = {
  width: number;
  height: number;
};

export function useVideoDimensions(
  containerRef: React.RefObject<HTMLDivElement>,
) {
  const [{ width: containerWidth, height: containerHeight }] =
    useResizeObserver(containerRef);
  const [videoResolution, setVideoResolution] = useState<VideoResolutionType>({
    width: 0,
    height: 0,
  });

  const videoAspectRatio = useMemo(() => {
    return videoResolution.width / videoResolution.height || 16 / 9;
  }, [videoResolution]);

  const containerAspectRatio = useMemo(() => {
    return containerWidth / containerHeight || 16 / 9;
  }, [containerWidth, containerHeight]);

  const videoDimensions = useMemo(() => {
    if (!containerWidth || !containerHeight)
      return { width: "100%", height: "100%" };
    if (containerAspectRatio > videoAspectRatio) {
      const height = containerHeight;
      const width = height * videoAspectRatio;
      return { width: `${width}px`, height: `${height}px` };
    } else {
      const width = containerWidth;
      const height = width / videoAspectRatio;
      return { width: `${width}px`, height: `${height}px` };
    }
  }, [containerWidth, containerHeight, videoAspectRatio, containerAspectRatio]);

  return {
    videoDimensions,
    setVideoResolution,
  };
}
