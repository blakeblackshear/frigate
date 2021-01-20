import { h } from 'preact';
import { ApiHost, Config } from '../context';
import { useCallback, useEffect, useContext, useState } from 'preact/hooks';

export default function AutoUpdatingCameraImage({ camera, searchParams }) {
  const config = useContext(Config);
  const apiHost = useContext(ApiHost);
  const cameraConfig = config.cameras[camera];

  const [key, setKey] = useState(Date.now());
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setKey(Date.now());
    }, 500);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [key, searchParams]);

  return (
    <img
      className="w-full"
      src={`${apiHost}/api/${camera}/latest.jpg?cache=${key}&${searchParams}`}
      alt={`Auto-updating ${camera} image`}
    />
  );
}
