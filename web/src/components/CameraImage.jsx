import { h } from 'preact';
import ActivityIndicator from './ActivityIndicator';
import { useApiHost, useConfig } from '../api';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useResizeObserver } from '../hooks';

export default function CameraImage({ camera, onload, searchParams = '', stretch = false }) {
  const { data: config } = useConfig();
  const apiHost = useApiHost();
  const [hasLoaded, setHasLoaded] = useState(false);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [{ width: availableWidth }] = useResizeObserver(containerRef);

  const { name, width, height } = config.cameras[camera];
  const aspectRatio = width / height;

  const scaledHeight = useMemo(() => {
    const scaledHeight = Math.floor(availableWidth / aspectRatio);
    return stretch ? scaledHeight : Math.min(scaledHeight, height);
  }, [availableWidth, aspectRatio, height, stretch]);
  const scaledWidth = useMemo(() => Math.ceil(scaledHeight * aspectRatio), [scaledHeight, aspectRatio]);

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
    if (scaledHeight === 0 || !canvasRef.current) {
      return;
    }
    img.src = `${apiHost}/api/${name}/latest.jpg?h=${scaledHeight}${searchParams ? `&${searchParams}` : ''}`;
  }, [apiHost, canvasRef, name, img, searchParams, scaledHeight]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <canvas data-testid="cameraimage-canvas" height={scaledHeight} ref={canvasRef} width={scaledWidth} />
      {!hasLoaded ? (
        <div className="absolute inset-0 flex justify-center" style={`height: ${scaledHeight}px`}>
          <ActivityIndicator />
        </div>
      ) : null}
    </div>
  );
}
