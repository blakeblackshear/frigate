import { useApiHost } from "@/api";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import ActivityIndicator from "../indicators/activity-indicator";
import { useResizeObserver } from "@/hooks/resize-observer";
import { isDesktop } from "react-device-detect";
import { cn } from "@/lib/utils";

type CameraImageProps = {
  className?: string;
  camera: string;
  onload?: () => void;
  searchParams?: string;
};

export default function CameraImage({
  className,
  camera,
  onload,
  searchParams = "",
}: CameraImageProps) {
  const { data: config } = useSWR("config");
  const apiHost = useApiHost();
  const [imageLoaded, setImageLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const { name } = config ? config.cameras[camera] : "";
  const enabled = config ? config.cameras[camera].enabled : "True";

  const [{ width: containerWidth, height: containerHeight }] =
    useResizeObserver(containerRef);

  const requestHeight = useMemo(() => {
    if (!config || containerHeight == 0) {
      return 360;
    }

    return Math.min(
      config.cameras[camera].detect.height,
      Math.round(containerHeight * (isDesktop ? 1.1 : 1.25)),
    );
  }, [config, camera, containerHeight]);

  const [isPortraitImage, setIsPortraitImage] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
    setIsPortraitImage(false);
  }, [camera]);

  useEffect(() => {
    if (!config || !imgRef.current) {
      return;
    }

    const newSrc = `${apiHost}api/${name}/latest.webp?h=${requestHeight}${
      searchParams ? `&${searchParams}` : ""
    }`;

    if (imgRef.current.src !== newSrc) {
      imgRef.current.src = newSrc;
    }
  }, [apiHost, name, searchParams, requestHeight, config, camera]);

  const handleImageLoad = () => {
    if (imgRef.current && containerWidth && containerHeight) {
      const { naturalWidth, naturalHeight } = imgRef.current;
      setIsPortraitImage(
        naturalWidth / naturalHeight < containerWidth / containerHeight,
      );
    }

    setImageLoaded(true);

    if (onload) {
      onload();
    }
  };

  return (
    <div className={className} ref={containerRef}>
      {enabled ? (
        <img
          ref={imgRef}
          className={cn(
            "object-contain",
            imageLoaded
              ? isPortraitImage
                ? "h-full w-auto"
                : "h-auto w-full"
              : "invisible",
            "rounded-lg md:rounded-2xl",
          )}
          onLoad={handleImageLoad}
        />
      ) : (
        <div className="pt-6 text-center">
          Camera is disabled in config, no stream or snapshot available!
        </div>
      )}
      {!imageLoaded && enabled ? (
        <div className="absolute bottom-0 left-0 right-0 top-0 flex items-center justify-center">
          <ActivityIndicator />
        </div>
      ) : null}
    </div>
  );
}
