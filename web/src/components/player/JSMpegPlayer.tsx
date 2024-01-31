import { baseUrl } from "@/api/baseUrl";
import { useResizeObserver } from "@/hooks/resize-observer";
// @ts-ignore we know this doesn't have types
import JSMpeg from "@cycjimmy/jsmpeg-player";
import { useEffect, useMemo, useRef } from "react";

type JSMpegPlayerProps = {
  camera: string;
  width: number;
  height: number;
};

export default function JSMpegPlayer({
  camera,
  width,
  height,
}: JSMpegPlayerProps) {
  const url = `${baseUrl.replace(/^http/, "ws")}live/jsmpeg/${camera}`;
  const playerRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [{ width: containerWidth }] = useResizeObserver(containerRef);

  // Add scrollbar width (when visible) to the available observer width to eliminate screen juddering.
  // https://github.com/blakeblackshear/frigate/issues/1657
  let scrollBarWidth = 0;
  if (window.innerWidth && document.body.offsetWidth) {
    scrollBarWidth = window.innerWidth - document.body.offsetWidth;
  }
  const availableWidth = scrollBarWidth
    ? containerWidth + scrollBarWidth
    : containerWidth;
  const aspectRatio = width / height;

  const scaledHeight = useMemo(() => {
    const scaledHeight = Math.floor(availableWidth / aspectRatio);
    const finalHeight = Math.min(scaledHeight, height);

    if (finalHeight > 0) {
      return finalHeight;
    }

    return 100;
  }, [availableWidth, aspectRatio, height]);
  const scaledWidth = useMemo(
    () => Math.ceil(scaledHeight * aspectRatio - scrollBarWidth),
    [scaledHeight, aspectRatio, scrollBarWidth]
  );

  useEffect(() => {
    if (!playerRef.current) {
      return;
    }

    const video = new JSMpeg.VideoElement(
      playerRef.current,
      url,
      {},
      { protocols: [], audio: false, videoBufferSize: 1024 * 1024 * 4 }
    );

    const fullscreen = () => {
      if (video.els.canvas.webkitRequestFullScreen) {
        video.els.canvas.webkitRequestFullScreen();
      } else {
        video.els.canvas.mozRequestFullScreen();
      }
    };

    video.els.canvas.addEventListener("click", fullscreen);

    return () => {
      if (playerRef.current) {
        try {
          video.destroy();
        } catch (e) {}
        playerRef.current = null;
      }
    };
  }, [url]);

  return (
    <div ref={containerRef}>
      <div
        ref={playerRef}
        className={`jsmpeg`}
        style={{
          height: `${scaledHeight}px`,
          width: `${scaledWidth}px`,
        }}
      />
    </div>
  );
}
