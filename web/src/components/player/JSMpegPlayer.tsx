import { baseUrl } from "@/api/baseUrl";
import JSMpeg from "@cycjimmy/jsmpeg-player";
import { useEffect, useRef } from "react";

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
  const playerRef = useRef<HTMLDivElement | null>(null);
  const url = `${baseUrl.replace(/^http/, "ws")}live/jsmpeg/${camera}`;

  useEffect(() => {
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
      video.destroy();
    };
  }, [url]);

  return (
    <div
      ref={playerRef}
      className="jsmpeg"
      style={{
        maxHeight: `${height}px`,
        maxWidth: `${width} px`,
      }}
    />
  );
}
