import { baseUrl } from "@/api/baseUrl";
import { useResizeObserver } from "@/hooks/resize-observer";
// @ts-expect-error we know this doesn't have types
import JSMpeg from "@cycjimmy/jsmpeg-player";
import React, { useEffect, useMemo, useRef } from "react";

type JSMpegPlayerProps = {
  className?: string;
  camera: string;
  width: number;
  height: number;
  containerRef?: React.MutableRefObject<HTMLDivElement | null>;
};

export default function JSMpegPlayer({
  camera,
  width,
  height,
  className,
  containerRef,
}: JSMpegPlayerProps) {
  const url = `${baseUrl.replace(/^http/, "ws")}live/jsmpeg/${camera}`;
  const playerRef = useRef<HTMLDivElement | null>(null);
  const internalContainerRef = useRef<HTMLDivElement | null>(null);

  const [{ width: containerWidth, height: containerHeight }] =
    useResizeObserver(containerRef ?? internalContainerRef);

  const stretch = true;
  const aspectRatio = width / height;

  const fitAspect = useMemo(
    () => containerWidth / containerHeight,
    [containerWidth, containerHeight],
  );

  const scaledHeight = useMemo(() => {
    if (containerRef?.current && width && height) {
      const scaledHeight =
        aspectRatio < (fitAspect ?? 0)
          ? Math.floor(
              Math.min(containerHeight, containerRef.current?.clientHeight),
            )
          : aspectRatio > fitAspect
            ? Math.floor(containerWidth / aspectRatio)
            : Math.floor(containerWidth / aspectRatio) / 1.5;
      const finalHeight = stretch
        ? scaledHeight
        : Math.min(scaledHeight, height);

      if (finalHeight > 0) {
        return finalHeight;
      }
    }
  }, [
    aspectRatio,
    containerWidth,
    containerHeight,
    fitAspect,
    height,
    width,
    stretch,
    containerRef,
  ]);

  const scaledWidth = useMemo(() => {
    if (aspectRatio && scaledHeight) {
      return Math.ceil(scaledHeight * aspectRatio);
    }
  }, [scaledHeight, aspectRatio]);

  useEffect(() => {
    if (!playerRef.current) {
      return;
    }

    const video = new JSMpeg.VideoElement(
      playerRef.current,
      url,
      { canvas: `#${camera}-canvas` },
      { protocols: [], audio: false, videoBufferSize: 1024 * 1024 * 4 },
    );

    return () => {
      if (playerRef.current) {
        try {
          video.destroy();
          // eslint-disable-next-line no-empty
        } catch (e) {}
        playerRef.current = null;
      }
    };
  }, [url, camera]);

  return (
    <div className={className} ref={internalContainerRef}>
      <div ref={playerRef} className="jsmpeg">
        <canvas
          id={`${camera}-canvas`}
          style={{
            width: scaledWidth ?? width,
            height: scaledHeight ?? height,
          }}
        ></canvas>
      </div>
    </div>
  );
}
