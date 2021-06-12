import { h } from 'preact';
import { baseUrl } from '../api/baseUrl';
import { useRef, useEffect } from 'preact/hooks';
import JSMpeg from '@cycjimmy/jsmpeg-player';

export default function JSMpegPlayer({ camera }) {
  const playerRef = useRef();
  const canvasRef = useRef();
  const url = `${baseUrl.replace(/^http/, 'ws')}/live/${camera}`

  useEffect(() => {
    const video = new JSMpeg.VideoElement(
      playerRef.current,
      url,
      {canvas: canvasRef.current},
      {protocols: [], audio: false}
    );

    return () => {
      video.destroy();
    };
  }, [url]);

  return (
    <div ref={playerRef} className="jsmpeg">
      <canvas ref={canvasRef} className="relative w-full" />
    </div>
  );
}
