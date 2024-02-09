import { useApiHost } from "@/api";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import ActivityIndicator from "../ui/activity-indicator";

type CameraImageProps = {
  className?: string;
  camera: string;
  onload?: () => void;
  searchParams?: {};
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

  useEffect(() => {
    if (!config || !imgRef.current) {
      return;
    }

    imgRef.current.src = `${apiHost}api/${name}/latest.jpg${
      searchParams ? `?${searchParams}` : ""
    }`;
  }, [apiHost, name, imgRef, searchParams, config]);

  return (
    <div
      className={`relative w-full h-full flex justify-center ${className}`}
      ref={containerRef}
    >
      {enabled ? (
        <img
          ref={imgRef}
          className="object-contain rounded-2xl"
          onLoad={() => {
            setHasLoaded(true);

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
