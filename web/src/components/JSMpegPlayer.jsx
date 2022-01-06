import { h } from 'preact';
import { baseUrl } from '../api/baseUrl';
import { useRef, useEffect } from 'preact/hooks';
import JSMpeg from '@cycjimmy/jsmpeg-player';

export default function JSMpegPlayer({ camera, width, height }) {
  const playerRef = useRef();
  const url = `${baseUrl.replace(/^http/, 'ws')}/live/${camera}`

  useEffect(() => {
    let wakeLock = null;

    const requestWakeLock = async () => {
      if (!navigator.wakeLock) {
        return;
      }

      try {
        wakeLock = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.warn(err);
      }
    }

    const video = new JSMpeg.VideoElement(
      playerRef.current,
      url,
      {},
      {protocols: [], audio: false, videoBufferSize: 1024*1024*4}
    );

    const fullscreen = () => {
      requestWakeLock();

      if(video.els.canvas.webkitRequestFullScreen) {
        video.els.canvas.webkitRequestFullScreen();
      }
      else {
        video.els.canvas.mozRequestFullScreen();
      }
    }

    const fullscreenchange = () => {
      if (document.webkitIsFullScreen) {
        return;
      }

      if (wakeLock === null) {
        return;
      }

      wakeLock.release().then(() => {
        wakeLock = null;
      });
    }

    video.els.canvas.addEventListener('click',fullscreen)
    video.els.canvas.addEventListener('webkitfullscreenchange',fullscreenchange)

    return () => {
      video.els.canvas.removeEventListener('click',fullscreen)
      video.els.canvas.removeEventListener('webkitfullscreenchange',fullscreenchange)
      video.destroy();
    };
  }, [url]);

  return (
    <div ref={playerRef} class="jsmpeg" style={`max-height: ${height}px; max-width: ${width}px`} />
  );
}
