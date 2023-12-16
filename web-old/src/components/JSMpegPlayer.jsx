import { h } from 'preact';
import { baseUrl } from '../api/baseUrl';
import { useRef, useEffect } from 'preact/hooks';
import JSMpeg from '@cycjimmy/jsmpeg-player';

export default function JSMpegPlayer({ camera, width, height }) {
  const playerRef = useRef();
  const url = `${baseUrl.replace(/^http/, 'ws')}live/jsmpeg/${camera}`;

  useEffect(() => {
    const video = new JSMpeg.VideoElement(
      playerRef.current,
      url,
      {},
      {protocols: [], audio: false, videoBufferSize: 1024*1024*4}
    );

    const fullscreen = () => {
      if (video.els.canvas.webkitRequestFullScreen) {
        video.els.canvas.webkitRequestFullScreen();
      }
      else {
        video.els.canvas.mozRequestFullScreen();
      }
    };

    video.els.canvas.addEventListener('click',fullscreen);

    return () => {
      video.destroy();
    };
  }, [url]);

  return (
    <div ref={playerRef} class="jsmpeg" style={`max-height: ${height}px; max-width: ${width}px`} />
  );
}
