import { baseUrl } from "@/api/baseUrl";
import { useResizeObserver } from "@/hooks/resize-observer";
import { cn } from "@/lib/utils";
// @ts-expect-error we know this doesn't have types
import JSMpeg from "@cycjimmy/jsmpeg-player";
import React, { useEffect, useMemo, useRef, useState } from "react";

type JSMpegPlayerProps = {
  className?: string;
  camera: string;
  width: number;
  height: number;
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
  playbackEnabled: boolean;
  onPlaying?: () => void;
};

export default function JSMpegPlayer({
  camera,
  width,
  height,
  className,
  containerRef,
  playbackEnabled,
  onPlaying,
}: JSMpegPlayerProps) {
  const url = `${baseUrl.replace(/^http/, "ws")}live/jsmpeg/${camera}`;
  const videoRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const internalContainerRef = useRef<HTMLDivElement | null>(null);
  const onPlayingRef = useRef(onPlaying);
  const [showCanvas, setShowCanvas] = useState(false);

  const selectedContainerRef = useMemo(
    () => (containerRef.current ? containerRef : internalContainerRef),
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [containerRef, containerRef.current, internalContainerRef],
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

  useEffect(() => {
    onPlayingRef.current = onPlaying;
  }, [onPlaying]);

  useEffect(() => {
    if (!selectedContainerRef?.current || !url) {
      return;
    }

    const videoWrapper = videoRef.current;
    const canvas = canvasRef.current;
    let hasData = false;
    let videoElement: JSMpeg.VideoElement | null = null;

    if (videoWrapper && playbackEnabled) {
      // Delayed init to avoid issues with react strict mode
      const initPlayer = setTimeout(() => {
        videoElement = new JSMpeg.VideoElement(
          videoWrapper,
          url,
          { canvas: canvas },
          {
            protocols: [],
            audio: false,
            videoBufferSize: 1024 * 1024 * 4,
            onVideoDecode: () => {
              if (!hasData) {
                hasData = true;
                setShowCanvas(true);
                onPlayingRef.current?.();
              }
            },
          },
        );
      }, 0);

      return () => {
        clearTimeout(initPlayer);
        if (videoElement) {
          try {
            // this causes issues in react strict mode
            // https://stackoverflow.com/questions/76822128/issue-with-cycjimmy-jsmpeg-player-in-react-18-cannot-read-properties-of-null-o
            videoElement.destroy();
            // eslint-disable-next-line no-empty
          } catch (e) {}
        }
      };
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackEnabled, url]);

  return (
    <div className={cn(className, !containerRef.current && "size-full")}>
      <div className="internal-jsmpeg-container" ref={internalContainerRef}>
        <div ref={videoRef} className={cn("jsmpeg", !showCanvas && "hidden")}>
          <canvas
            ref={canvasRef}
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
