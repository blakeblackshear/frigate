import { useApiHost } from "@/api";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import ActivityIndicator from "../indicators/activity-indicator";
import { useResizeObserver } from "@/hooks/resize-observer";
import { isDesktop } from "react-device-detect";

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
  const [hasLoaded, setHasLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const { name } = config ? config.cameras[camera] : "";
  const enabled = config ? config.cameras[camera].enabled : "True";
  const [isPortraitImage, setIsPortraitImage] = useState(false);

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

  useEffect(() => {
    if (!config || !imgRef.current) {
      return;
    }

    imgRef.current.src = `${apiHost}api/${name}/latest.jpg?h=${requestHeight}${
      searchParams ? `&${searchParams}` : ""
    }`;
  }, [apiHost, name, imgRef, searchParams, requestHeight, config]);

  return (
    <div className={className} ref={containerRef}>
      {enabled ? (
        <img
          ref={imgRef}
          className={`object-contain ${isPortraitImage ? "h-full w-auto" : "h-auto w-full"} rounded-lg md:rounded-2xl`}
          onLoad={() => {
            setHasLoaded(true);

            if (imgRef.current) {
              const { naturalHeight, naturalWidth } = imgRef.current;
              setIsPortraitImage(
                naturalWidth / naturalHeight < containerWidth / containerHeight,
              );
            }

            if (onload) {
              onload();
            }
          }}
        />
      ) : (
        <div className="pt-6 text-center">
          Camera is disabled in config, no stream or snapshot available!
        </div>
      )}
      {!hasLoaded && enabled ? (
        <div className="absolute bottom-0 left-0 right-0 top-0 flex items-center justify-center">
          <ActivityIndicator />
        </div>
      ) : null}
    </div>
  );
}
