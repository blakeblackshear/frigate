import { useApiHost } from "@/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import ActivityIndicator from "../indicators/activity-indicator";
import { useResizeObserver } from "@/hooks/resize-observer";
import { cn } from "@/lib/utils";

type CameraImageProps = {
  className?: string;
  camera: string;
  onload?: (event: Event) => void;
  searchParams?: string;
  stretch?: boolean; // stretch to fit width
  fitAspect?: number; // shrink to fit height
};

export default function CameraImage({
  className,
  camera,
  onload,
  searchParams = "",
  stretch = false,
  fitAspect,
}: CameraImageProps) {
  const { data: config } = useSWR("config");
  const apiHost = useApiHost();
  const [hasLoaded, setHasLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [{ width: containerWidth, height: containerHeight }] =
    useResizeObserver(containerRef);

  // Add scrollbar width (when visible) to the available observer width to eliminate screen juddering.
  // https://github.com/blakeblackshear/frigate/issues/1657
  let scrollBarWidth = 0;
  if (window.innerWidth && document.body.offsetWidth) {
    scrollBarWidth = window.innerWidth - document.body.offsetWidth;
  }
  const availableWidth = scrollBarWidth
    ? containerWidth + scrollBarWidth
    : containerWidth;

  const { name } = config ? config.cameras[camera] : "";
  const enabled = config ? config.cameras[camera].enabled : "True";
  const { width, height } = config
    ? config.cameras[camera].detect
    : { width: 1, height: 1 };
  const aspectRatio = width / height;

  const scaledHeight = useMemo(() => {
    const scaledHeight =
      aspectRatio < (fitAspect ?? 0)
        ? Math.floor(containerHeight)
        : Math.floor(availableWidth / aspectRatio);
    const finalHeight = stretch ? scaledHeight : Math.min(scaledHeight, height);

    if (finalHeight > 0) {
      return finalHeight;
    }

    return 100;
  }, [
    availableWidth,
    aspectRatio,
    containerHeight,
    fitAspect,
    height,
    stretch,
  ]);
  const scaledWidth = useMemo(
    () => Math.ceil(scaledHeight * aspectRatio - scrollBarWidth),
    [scaledHeight, aspectRatio, scrollBarWidth],
  );

  const img = useMemo(() => new Image(), []);
  img.onload = useCallback(
    (event: Event) => {
      setHasLoaded(true);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        ctx?.drawImage(img, 0, 0, scaledWidth, scaledHeight);
      }
      onload && onload(event);
    },
    [img, scaledHeight, scaledWidth, setHasLoaded, onload, canvasRef],
  );

  useEffect(() => {
    if (!config || scaledHeight === 0 || !canvasRef.current) {
      return;
    }
    img.src = `${apiHost}api/${name}/latest.jpg?h=${scaledHeight}${
      searchParams ? `&${searchParams}` : ""
    }`;
  }, [apiHost, canvasRef, name, img, searchParams, scaledHeight, config]);

  return (
    <div
      className={cn("relative w-full h-full flex justify-center", className)}
      ref={containerRef}
    >
      {enabled ? (
        <canvas
          className="rounded-lg md:rounded-2xl"
          data-testid="cameraimage-canvas"
          height={scaledHeight}
          ref={canvasRef}
          width={scaledWidth}
        />
      ) : (
        <div className="text-center pt-6">
          Camera is disabled in config, no stream or snapshot available!
        </div>
      )}
      {!hasLoaded && enabled ? (
        <div
          className="absolute inset-0 flex justify-center"
          style={{ height: `${scaledHeight}px` }}
        >
          <ActivityIndicator />
        </div>
      ) : null}
    </div>
  );
}
