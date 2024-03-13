import { baseUrl } from "@/api/baseUrl";
// @ts-expect-error we know this doesn't have types
import JSMpeg from "@cycjimmy/jsmpeg-player";
import { useEffect, useRef } from "react";

type JSMpegPlayerProps = {
  className?: string;
  camera: string;
  width: number;
  height: number;
};

export default function JSMpegPlayer({
  camera,
  width,
  height,
  className,
}: JSMpegPlayerProps) {
  const url = `${baseUrl.replace(/^http/, "ws")}live/jsmpeg/${camera}`;
  const playerRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!playerRef.current) {
      return;
    }

    const video = new JSMpeg.VideoElement(
      playerRef.current,
      url,
      {},
      { protocols: [], audio: false, videoBufferSize: 1024 * 1024 * 4 },
    );

    return () => {
      if (playerRef.current) {
        try {
          video.destroy();
          // eslint-disable-next-line no-empty
        } catch (e) {}
        playerRef.current = null;
      }
    };
  }, [url]);

  return (
    <div className={className} ref={containerRef}>
      <div
        ref={playerRef}
        className="jsmpeg h-full"
        style={{ aspectRatio: width / height }}
      />
    </div>
  );
}
