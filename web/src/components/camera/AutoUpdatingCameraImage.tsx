import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CameraImage from "./CameraImage";

type AutoUpdatingCameraImageProps = {
  camera: string;
  searchParams?: URLSearchParams;
  showFps?: boolean;
  className?: string;
  cameraClasses?: string;
  reloadInterval?: number;
  periodicCache?: boolean;
};

const MIN_LOAD_TIMEOUT_MS = 200;

export default function AutoUpdatingCameraImage({
  camera,
  searchParams = undefined,
  showFps = true,
  className,
  cameraClasses,
  reloadInterval = MIN_LOAD_TIMEOUT_MS,
  periodicCache = false,
}: AutoUpdatingCameraImageProps) {
  const [key, setKey] = useState(Date.now());
  const [fps, setFps] = useState<string>("0");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (reloadInterval == -1) {
      return;
    }

    setKey(Date.now());

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadInterval]);

  const handleLoad = useCallback(() => {
    setIsCached(true);

    if (reloadInterval == -1) {
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const loadTime = Date.now() - key;

    if (showFps) {
      setFps((1000 / Math.max(loadTime, reloadInterval)).toFixed(1));
    }

    timeoutRef.current = setTimeout(
      () => {
        setKey(Date.now());
      },
      loadTime > reloadInterval ? 1 : reloadInterval,
    );
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setFps]);

  // periodic cache to reduce loading indicator

  const [isCached, setIsCached] = useState(false);

  const cacheKey = useMemo(() => {
    let baseParam = "";

    if (periodicCache && !isCached) {
      const date = new Date(key);
      date.setMinutes(date.getMinutes() - (date.getMinutes() % 10), 0, 0);

      baseParam = `store=1&cache=${date.getTime() / 1000}`;
    } else {
      baseParam = `cache=${key}`;
    }

    return `${baseParam}${searchParams ? `&${searchParams}` : ""}`;
  }, [isCached, periodicCache, key, searchParams]);

  return (
    <div className={className}>
      <CameraImage
        camera={camera}
        onload={handleLoad}
        searchParams={cacheKey}
        className={cameraClasses}
      />
      {showFps ? <span className="text-xs">Displaying at {fps}fps</span> : null}
    </div>
  );
}
