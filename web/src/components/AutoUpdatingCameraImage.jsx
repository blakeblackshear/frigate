import { h } from 'preact';
import CameraImage from './CameraImage';
import { ApiHost, Config } from '../context';
import { useCallback, useEffect, useContext, useState } from 'preact/hooks';

export default function AutoUpdatingCameraImage({ camera, searchParams }) {
  const apiHost = useContext(ApiHost);

  const [key, setKey] = useState(Date.now());
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setKey(Date.now());
    }, 500);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [key, searchParams]);

  return <CameraImage camera={camera} searchParams={`cache=${key}&${searchParams}`} />;
}
