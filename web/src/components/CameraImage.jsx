import { h } from 'preact';
import ActivityIndicator from './ActivityIndicator';
import { useApiHost } from '../api';
import useSWR from 'swr';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useResizeObserver } from '../hooks';

export default function CameraImage({ camera, onload, searchParams = '', stretch = false }) {
  const { data: config } = useSWR('config');
  const apiHost = useApiHost();
  const [hasLoaded, setHasLoaded] = useState(false);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [{ width: containerWidth }] = useResizeObserver(containerRef);

  // Add scrollbar width (when visible) to the available observer width to eliminate screen juddering.
  // https://github.com/blakeblackshear/frigate/issues/1657
  let scrollBarWidth = 0;
  if (window.innerWidth && document.body.offsetWidth) {
    scrollBarWidth = window.innerWidth - document.body.offsetWidth;
  }
  const availableWidth = scrollBarWidth ? containerWidth + scrollBarWidth : containerWidth;

  const { name } = config ? config.cameras[camera] : '';
  const enabled = config ? config.cameras[camera].enabled : 'True';
  const { width, height } = config ? config.cameras[camera].detect : { width: 1, height: 1 };
  const aspectRatio = width / height;

  const scaledHeight = useMemo(() => {
    const scaledHeight = Math.floor(availableWidth / aspectRatio);
    return stretch ? scaledHeight : Math.min(scaledHeight, height);
  }, [availableWidth, aspectRatio, height, stretch]);
  const scaledWidth = useMemo(() => Math.ceil(scaledHeight * aspectRatio - scrollBarWidth), [
    scaledHeight,
    aspectRatio,
    scrollBarWidth,
  ]);

  const img = useMemo(() => new Image(), []);
  img.onload = useCallback(
    (event) => {
      setHasLoaded(true);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
      }
      onload && onload(event);
    },
    [img, scaledHeight, scaledWidth, setHasLoaded, onload, canvasRef]
  );

  useEffect(() => {
    if (!config || scaledHeight === 0 || !canvasRef.current) {
      return;
    }
    img.src = `${apiHost}/api/${name}/latest.jpg?h=${scaledHeight}${searchParams ? `&${searchParams}` : ''}`;
  }, [apiHost, canvasRef, name, img, searchParams, scaledHeight, config]);

  return (
    <div className="relative w-full" ref={containerRef}>
      {
        (enabled) ?
          <canvas data-testid="cameraimage-canvas" height={scaledHeight} ref={canvasRef} width={scaledWidth} />
          : <div class="text-center pt-6">Camera is disabled in config, no stream or snapshot available!</div>
      }
      {
        (!hasLoaded && enabled) ? (
          <div className="absolute inset-0 flex justify-center" style={`height: ${scaledHeight}px`}>
            <ActivityIndicator />
          </div>
        ) : null
      }
    </div >
  );
}
