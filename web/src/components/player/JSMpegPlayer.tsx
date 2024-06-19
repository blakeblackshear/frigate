import { baseUrl } from "@/api/baseUrl";
import { useResizeObserver } from "@/hooks/resize-observer";
import { cn } from "@/lib/utils";
// @ts-expect-error we know this doesn't have types
import JSMpeg from "@cycjimmy/jsmpeg-player";
import React, { useEffect, useMemo, useRef, useId, useState } from "react";

type JSMpegPlayerProps = {
  className?: string;
  camera: string;
  width: number;
  height: number;
  containerRef?: React.MutableRefObject<HTMLDivElement | null>;
  onPlaying?: () => void;
};

export default function JSMpegPlayer({
  camera,
  width,
  height,
  className,
  containerRef,
  onPlaying,
}: JSMpegPlayerProps) {
  const url = `${baseUrl.replace(/^http/, "ws")}live/jsmpeg/${camera}`;
  const playerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef(null);
  const internalContainerRef = useRef<HTMLDivElement | null>(null);
  const onPlayingRef = useRef(onPlaying);
  const [showCanvas, setShowCanvas] = useState(false);

  const selectedContainerRef = useMemo(
    () => containerRef ?? internalContainerRef,
    [containerRef, internalContainerRef],
  );

  const [{ width: containerWidth, height: containerHeight }] =
    useResizeObserver(selectedContainerRef);

  const stretch = true;
  const aspectRatio = width / height;

  const fitAspect = useMemo(
    () => containerWidth / containerHeight,
    [containerWidth, containerHeight],
  );

  const scaledHeight = useMemo(() => {
    if (selectedContainerRef?.current && width && height) {
      const scaledHeight =
        aspectRatio < (fitAspect ?? 0)
          ? Math.floor(
              Math.min(
                containerHeight,
                selectedContainerRef.current?.clientHeight,
              ),
            )
          : aspectRatio >= fitAspect
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
    selectedContainerRef,
  ]);

  const scaledWidth = useMemo(() => {
    if (aspectRatio && scaledHeight) {
      return Math.ceil(scaledHeight * aspectRatio);
    }
  }, [scaledHeight, aspectRatio]);

  const uniqueId = useId();

  useEffect(() => {
    onPlayingRef.current = onPlaying;
  }, [onPlaying]);

  useEffect(() => {
    if (!playerRef.current || videoRef.current) {
      return;
    }

    videoRef.current = new JSMpeg.VideoElement(
      playerRef.current,
      url,
      { canvas: `#${CSS.escape(uniqueId)}` },
      {
        protocols: [],
        audio: false,
        videoBufferSize: 1024 * 1024 * 4,
        onPlay: () => {
          setShowCanvas(true);
          onPlayingRef.current?.();
        },
      },
    );
  }, [url, uniqueId]);

  return (
    <div className={className}>
      <div className="size-full" ref={internalContainerRef}>
        <div ref={playerRef} className={cn("jsmpeg", !showCanvas && "hidden")}>
          <canvas
            id={uniqueId}
            style={{
              width: scaledWidth ?? width,
              height: scaledHeight ?? height,
            }}
          ></canvas>
        </div>
      </div>
    </div>
  );
}
