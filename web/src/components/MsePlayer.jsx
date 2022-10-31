import { h } from 'preact';
import { baseUrl } from '../api/baseUrl';
import { useEffect } from 'preact/hooks';

export default function MsePlayer({ camera, width, height }) {
  const url = `${baseUrl.replace(/^http/, 'ws')}live/webrtc/api/ws?src=${camera}`;

  useEffect(() => {
    const video = document.querySelector('#video');

    // support api_path
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';

    let mediaSource;

    ws.onopen = () => {
      // https://web.dev/i18n/en/fast-playback-with-preload/#manual_buffering
      // https://developer.mozilla.org/en-US/docs/Web/API/Media_Source_Extensions_API
      mediaSource = new MediaSource();
      video.src = URL.createObjectURL(mediaSource);
      mediaSource.onsourceopen = () => {
        mediaSource.onsourceopen = null;
        URL.revokeObjectURL(video.src);
        ws.send(JSON.stringify({ type: 'mse' }));
      };
    };

    let sourceBuffer,
      queueBuffer = [];

    ws.onmessage = (ev) => {
      if (typeof ev.data === 'string') {
        const data = JSON.parse(ev.data);

        if (data.type === 'mse') {
          sourceBuffer = mediaSource.addSourceBuffer(data.value);
          // important: segments supports TrackFragDecodeTime
          // sequence supports only TrackFragRunEntry Duration
          sourceBuffer.mode = 'segments';
          sourceBuffer.onupdateend = () => {
            if (!sourceBuffer.updating && queueBuffer.length > 0) {
              sourceBuffer.appendBuffer(queueBuffer.shift());
            }
          };
        }
      } else if (sourceBuffer.updating) {
        queueBuffer.push(ev.data);
      } else {
        sourceBuffer.appendBuffer(ev.data);
      }
    };

    let offsetTime = 1,
      noWaiting = 0;

    setInterval(() => {
      if (video.paused || video.seekable.length === 0) return;

      if (noWaiting < 0) {
        offsetTime = Math.min(offsetTime * 1.1, 5);
      } else if (noWaiting >= 30) {
        noWaiting = 0;
        offsetTime = Math.max(offsetTime * 0.9, 0.5);
      }
      noWaiting += 1;

      const endTime = video.seekable.end(video.seekable.length - 1);
      let playbackRate = (endTime - video.currentTime) / offsetTime;
      if (playbackRate < 0.1) {
        // video.currentTime = endTime - offsetTime;
        playbackRate = 0.1;
      } else if (playbackRate > 10) {
        // video.currentTime = endTime - offsetTime;
        playbackRate = 10;
      }
      // https://github.com/GoogleChrome/developer.chrome.com/issues/135
      video.playbackRate = playbackRate;
    }, 1000);

    video.onwaiting = () => {
      const endTime = video.seekable.end(video.seekable.length - 1);
      video.currentTime = endTime - offsetTime;
      noWaiting = -1;
    };
  }, [url]);

  return (
    <div>
      <video id="video" autoplay playsinline controls muted width={width} height={height} />
    </div>
  );
}
