import { h } from 'preact';
import { baseUrl } from '../api/baseUrl';
import { useRef, useEffect } from 'preact/hooks';
import JSMpeg from '@cycjimmy/jsmpeg-player';

export default function JSMpegPlayer({ camera }) {
  const playerRef = useRef();
  const url = `${baseUrl.replace(/^http/, 'ws')}/live/${camera}`

  useEffect(() => {
    const video = new JSMpeg.VideoElement(
      playerRef.current,
      url,
      {},
      {protocols: [], audio: false}
    );

    return () => {
      video.destroy();
    };
  }, [url]);

  return (
    <div ref={playerRef} class="jsmpeg">
    </div>
  );
}
