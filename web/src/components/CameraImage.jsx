import { h } from 'preact';
import { ApiHost, Config } from '../context';
import { useCallback, useEffect, useContext, useMemo, useRef, useState } from 'preact/hooks';

export default function CameraImage({ camera, onload, searchParams = '' }) {
  const config = useContext(Config);
  const apiHost = useContext(ApiHost);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [loadedSrc, setLoadedSrc] = useState(null);
  const containerRef = useRef(null);

  const { name, width, height } = config.cameras[camera];
  const aspectRatio = width / height;

  const resizeObserver = useMemo(() => {
    return new ResizeObserver((entries) => {
      window.requestAnimationFrame(() => {
        if (Array.isArray(entries) && entries.length) {
          setAvailableWidth(entries[0].contentRect.width);
        }
      });
    });
  }, [setAvailableWidth, width]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    resizeObserver.observe(containerRef.current);
  }, [resizeObserver, containerRef.current]);

  const scaledHeight = useMemo(() => Math.min(Math.ceil(availableWidth / aspectRatio), height), [
    availableWidth,
    aspectRatio,
    height,
  ]);

  const img = useMemo(() => new Image(), [camera]);
  img.onload = useCallback(
    (event) => {
      const src = event.srcElement.currentSrc;
      setLoadedSrc(src);
      onload && onload(event);
    },
    [searchParams, onload]
  );

  useEffect(() => {
    if (!scaledHeight) {
      return;
    }
    img.src = `${apiHost}/api/${name}/latest.jpg?h=${scaledHeight}${searchParams ? `&${searchParams}` : ''}`;
  }, [apiHost, name, img, searchParams, scaledHeight]);

  return (
    <div ref={containerRef}>
      {loadedSrc ? <img width={scaledHeight * aspectRatio} height={scaledHeight} src={loadedSrc} alt={name} /> : null}
    </div>
  );
}
