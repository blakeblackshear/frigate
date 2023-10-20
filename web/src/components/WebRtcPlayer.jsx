import { h } from 'preact';
import { baseUrl } from '../api/baseUrl';
import { useCallback, useEffect } from 'preact/hooks';
import { useMemo } from 'react';

export default function WebRtcPlayer({ camera, width, height }) {
  const url = `${baseUrl.replace(/^http/, 'ws')}live/webrtc/api/ws?src=${camera}`;
  const ws = useMemo(() => new WebSocket(url), [url])
  const PeerConnection = useCallback(async (media) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    const localTracks = [];

    if (/camera|microphone/.test(media)) {
      const tracks = await getMediaTracks('user', {
        video: media.indexOf('camera') >= 0,
        audio: media.indexOf('microphone') >= 0,
      });
      tracks.forEach((track) => {
        pc.addTransceiver(track, { direction: 'sendonly' });
        if (track.kind === 'video') localTracks.push(track);
      });
    }

    if (media.indexOf('display') >= 0) {
      const tracks = await getMediaTracks('display', {
        video: true,
        audio: media.indexOf('speaker') >= 0,
      });
      tracks.forEach((track) => {
        pc.addTransceiver(track, { direction: 'sendonly' });
        if (track.kind === 'video') localTracks.push(track);
      });
    }

    if (/video|audio/.test(media)) {
      const tracks = ['video', 'audio']
        .filter((kind) => media.indexOf(kind) >= 0)
        .map((kind) => pc.addTransceiver(kind, { direction: 'recvonly' }).receiver.track);
      localTracks.push(...tracks);
    }

    document.getElementById('video').srcObject = new MediaStream(localTracks);

    return pc;
  }, []);

  async function getMediaTracks(media, constraints) {
    try {
      const stream =
        media === 'user'
          ? await navigator.mediaDevices.getUserMedia(constraints)
          : await navigator.mediaDevices.getDisplayMedia(constraints);
      return stream.getTracks();
    } catch (e) {
      return [];
    }
  }

  const connect = useCallback(async () => {
    const pc = await PeerConnection('video+audio');

    ws.addEventListener('open', () => {
      pc.addEventListener('icecandidate', (ev) => {
        if (!ev.candidate) return;
        const msg = { type: 'webrtc/candidate', value: ev.candidate.candidate };
        ws.send(JSON.stringify(msg));
      });

      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          const msg = { type: 'webrtc/offer', value: pc.localDescription.sdp };
          ws.send(JSON.stringify(msg));
        });
    });

    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'webrtc/candidate') {
        pc.addIceCandidate({ candidate: msg.value, sdpMid: '0' });
      } else if (msg.type === 'webrtc/answer') {
        pc.setRemoteDescription({ type: 'answer', sdp: msg.value });
      }
    });

    ws.addEventListener('close', () => {
      pc.close();
    })
  }, [PeerConnection, ws]);

  useEffect(() => {
    connect();

    return () => {
      ws.close();
    }
  }, [connect, ws]);

  return (
    <div>
      <video id="video" autoplay playsinline controls muted width={width} height={height} />
    </div>
  );
}
