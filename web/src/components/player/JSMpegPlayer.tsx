import { baseUrl } from "@/api/baseUrl";
import { useResizeObserver } from "@/hooks/resize-observer";
import { cn } from "@/lib/utils";
import { PlayerStatsType } from "@/types/live";
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
  useWebGL: boolean;
  setStats?: (stats: PlayerStatsType) => void;
  onPlaying?: () => void;
};

export default function JSMpegPlayer({
  camera,
  width,
  height,
  className,
  containerRef,
  playbackEnabled,
  useWebGL = false,
  setStats,
  onPlaying,
}: JSMpegPlayerProps) {
  const url = `${baseUrl.replace(/^http/, "ws")}live/jsmpeg/${camera}`;
  const videoRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const internalContainerRef = useRef<HTMLDivElement | null>(null);
  const onPlayingRef = useRef(onPlaying);
  const [showCanvas, setShowCanvas] = useState(false);
  const [hasData, setHasData] = useState(false);
  const hasDataRef = useRef(hasData);
  const [dimensionsReady, setDimensionsReady] = useState(false);
  const bytesReceivedRef = useRef(0);
  const lastTimestampRef = useRef(Date.now());
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
    return undefined;
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
    return undefined;
  }, [scaledHeight, aspectRatio]);

  useEffect(() => {
    if (scaledWidth && scaledHeight) {
      setDimensionsReady(true);
    }
  }, [scaledWidth, scaledHeight]);

  useEffect(() => {
    onPlayingRef.current = onPlaying;
  }, [onPlaying]);

  useEffect(() => {
    if (!selectedContainerRef?.current || !url) {
      return;
    }

    const videoWrapper = videoRef.current;
    const canvas = canvasRef.current;
    let videoElement: JSMpeg.VideoElement | null = null;
    let socket: WebSocket | null = null;
    let socketMessageHandler: ((event: MessageEvent) => void) | null = null;

    let frameCount = 0;

    setHasData(false);

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
            disableGl: !useWebGL,
            disableWebAssembly: !useWebGL,
            videoBufferSize: 1024 * 1024 * 4,
            onVideoDecode: () => {
              if (!hasDataRef.current) {
                setHasData(true);
                onPlayingRef.current?.();
              }
              frameCount++;
            },
          },
        );

        // Set up WebSocket message handler
        if (
          videoElement.player &&
          videoElement.player.source &&
          videoElement.player.source.socket
        ) {
          socket = videoElement.player.source.socket as WebSocket;
          socketMessageHandler = (event: MessageEvent) => {
            if (event.data instanceof ArrayBuffer) {
              bytesReceivedRef.current += event.data.byteLength;
            }
          };

          socket.addEventListener("message", socketMessageHandler);
        }

        // Update stats every second
        statsIntervalRef.current = setInterval(() => {
          const currentTimestamp = Date.now();
          const timeDiff = (currentTimestamp - lastTimestampRef.current) / 1000; // in seconds
          const bitrate = bytesReceivedRef.current / timeDiff / 1000; // in kBps

          setStats?.({
            streamType: "jsmpeg",
            bandwidth: Math.round(bitrate),
            totalFrames: frameCount,
            latency: undefined,
            droppedFrames: undefined,
            decodedFrames: undefined,
            droppedFrameRate: undefined,
          });

          bytesReceivedRef.current = 0;
          lastTimestampRef.current = currentTimestamp;
        }, 1000);

        return () => {
          if (statsIntervalRef.current) {
            clearInterval(statsIntervalRef.current);
            frameCount = 0;
            statsIntervalRef.current = null;
          }
        };
      }, 0);

      return () => {
        clearTimeout(initPlayer);
        if (statsIntervalRef.current) {
          clearInterval(statsIntervalRef.current);
          statsIntervalRef.current = null;
        }
        if (videoElement) {
          try {
            videoElement.player?.destroy();
            // eslint-disable-next-line no-empty
          } catch (e) {}

          if (videoWrapper) {
            videoWrapper.innerHTML = "";
            // @ts-expect-error playerInstance is set by jsmpeg
            videoWrapper.playerInstance = null;
          }
        }
        if (socket) {
          if (socketMessageHandler) {
            socket.removeEventListener("message", socketMessageHandler);
          }

          socket = null;
          socketMessageHandler = null;
        }
      };
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackEnabled, url]);

  useEffect(() => {
    setShowCanvas(hasData && dimensionsReady);
  }, [hasData, dimensionsReady]);

  useEffect(() => {
    hasDataRef.current = hasData;
  }, [hasData]);

  return (
    <div className={cn(className, !containerRef.current && "size-full")}>
      <div
        className="internal-jsmpeg-container size-full"
        ref={internalContainerRef}
      >
        <div
          ref={videoRef}
          className={cn(
            "jsmpeg flex h-full w-auto items-center justify-center",
            !showCanvas && "hidden",
          )}
        >
          <canvas
            ref={canvasRef}
            className="rounded-lg md:rounded-2xl"
            style={{
              width: scaledWidth,
              height: scaledHeight,
            }}
          ></canvas>
        </div>
      </div>
    </div>
  );
}
