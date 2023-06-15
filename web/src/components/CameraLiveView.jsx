import { h } from 'preact';
import { useApiHost } from '../api';
import { useMemo, useRef } from 'preact/hooks';
import { useResizeObserver } from '../hooks';
import useSWR from 'swr';

export default function CameraLiveView({ camera, stretch = false }) {
  const { data: config } = useSWR('config');
  const apiHost = useApiHost();
  const containerRef = useRef(null);
  const [{ width: containerWidth }] = useResizeObserver(containerRef);

  const { name } = config ? config.cameras[camera] : '';
  const enabled = config ? config.cameras[camera].enabled : 'True';
  const { width, height } = config ? config.cameras[camera].detect : { width: 1, height: 1 };
  const aspectRatio = width / height;

  const scaledHeight = useMemo(() => {
    const scaledHeight = Math.floor(containerWidth / aspectRatio);
    return stretch ? scaledHeight : Math.min(scaledHeight, height);
  }, [containerWidth, aspectRatio, height, stretch]);

  const scaledWidth = useMemo(() => Math.ceil(scaledHeight * aspectRatio), [
    scaledHeight,
    aspectRatio,
  ]);

  const liveStreamUrl = useMemo(() => {
    return `${apiHost}/api/${name}`;
  }, [apiHost, name]);

  return (
    <div className="relative w-full" ref={containerRef}>
      {
        (enabled) ?
          <img 
            data-testid="cameraliveview-img" 
            height={scaledHeight} 
            width={scaledWidth} 
            src={liveStreamUrl}
          /> 
          : <div class="text-center pt-6">Camera is disabled in config, no stream or snapshot available!</div>
      }
    </div >
  );
}
