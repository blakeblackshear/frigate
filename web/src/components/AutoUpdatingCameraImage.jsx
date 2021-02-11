import { h } from 'preact';
import CameraImage from './CameraImage';
import { useCallback, useState } from 'preact/hooks';

const MIN_LOAD_TIMEOUT_MS = 200;

export default function AutoUpdatingCameraImage({ camera, searchParams = '', showFps = true }) {
  const [key, setKey] = useState(Date.now());
  const [fps, setFps] = useState(0);

  const handleLoad = useCallback(() => {
    const loadTime = Date.now() - key;
    setFps((1000 / Math.max(loadTime, MIN_LOAD_TIMEOUT_MS)).toFixed(1));
    setTimeout(
      () => {
        setKey(Date.now());
      },
      loadTime > MIN_LOAD_TIMEOUT_MS ? 1 : MIN_LOAD_TIMEOUT_MS
    );
  }, [key, setFps]);

  return (
    <div>
      <CameraImage camera={camera} onload={handleLoad} searchParams={`cache=${key}&${searchParams}`} />
      {showFps ? <span className="text-xs">Displaying at {fps}fps</span> : null}
    </div>
  );
}
