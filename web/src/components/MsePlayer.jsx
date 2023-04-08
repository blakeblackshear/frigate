import { h } from 'preact';
import { baseUrl } from '../api/baseUrl';
import { useEffect } from 'preact/hooks';

export default function MsePlayer({ camera, width, height }) {
  const url = `${baseUrl.replace(/^http/, 'ws')}live/mse/api/ws?src=${camera}`;

  useEffect(() => {
    const video = document.querySelector('#video');

    // support api_path
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    let mediaSource,
      sourceBuffer,
      queueBuffer = [];

    ws.onopen = () => {
      mediaSource = new MediaSource();
      video.src = URL.createObjectURL(mediaSource);
      mediaSource.onsourceopen = () => {
        mediaSource.onsourceopen = null;
        URL.revokeObjectURL(video.src);
        ws.send(JSON.stringify({ type: 'mse' }));
      };
    };

    ws.onmessage = (ev) => {
      if (typeof ev.data === 'string') {
        const data = JSON.parse(ev.data);

        if (data.type === 'mse') {
          sourceBuffer = mediaSource.addSourceBuffer(data.value);
          sourceBuffer.mode = 'segments'; // segments or sequence
          sourceBuffer.onupdateend = () => {
            if (!sourceBuffer.updating && queueBuffer.length > 0) {
              try {
                sourceBuffer.appendBuffer(queueBuffer.shift());
              } catch (e) {
                // console.warn(e);
              }
            }
          };
        }
      } else if (sourceBuffer.updating || queueBuffer.length > 0) {
        queueBuffer.push(ev.data);
      } else {
        try {
          sourceBuffer.appendBuffer(ev.data);
        } catch (e) {
          // console.warn(e);
        }
      }

      if (video.seekable.length > 0) {
        const delay = video.seekable.end(video.seekable.length - 1) - video.currentTime;
        if (delay < 1) {
          video.playbackRate = 1;
        } else if (delay > 10) {
          video.playbackRate = 10;
        } else if (delay > 2) {
          video.playbackRate = Math.floor(delay);
        }
      }
    };

    return () => {
      const video = document.getElementById('video');
      video.srcObject = null;
      ws.close();
    };
  }, [url]);

  return (
    <div>
      <video id="video" autoplay playsinline controls muted width={width} height={height} />
    </div>
  );
}
