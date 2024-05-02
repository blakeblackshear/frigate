import { useApiHost } from "@/api";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import ActivityIndicator from "../indicators/activity-indicator";
import { useResizeObserver } from "@/hooks/resize-observer";

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

  useEffect(() => {
    if (!config || !imgRef.current) {
      return;
    }

    imgRef.current.src = `${apiHost}api/${name}/latest.jpg${
      searchParams ? `?${searchParams}` : ""
    }`;
  }, [apiHost, name, imgRef, searchParams, config]);

  const [{ width: containerWidth, height: containerHeight }] =
    useResizeObserver(containerRef);

  return (
    <div className={className} ref={containerRef}>
      {enabled ? (
        <img
          ref={imgRef}
          className={`object-contain ${isPortraitImage ? "h-full w-auto" : "w-full h-auto"} rounded-lg md:rounded-2xl`}
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
        <div className="text-center pt-6">
          Camera is disabled in config, no stream or snapshot available!
        </div>
      )}
      {!hasLoaded && enabled ? (
        <div className="absolute left-0 right-0 top-0 bottom-0 flex justify-center items-center">
          <ActivityIndicator />
        </div>
      ) : null}
    </div>
  );
}
