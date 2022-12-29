import { h } from 'preact';
import { baseUrl } from '../api/baseUrl';
import { useEffect } from 'preact/hooks';

export default function WebRtcPlayer({ camera, width, height }) {
  const url = `${baseUrl.replace(/^http/, 'ws')}live/webrtc/api/ws?src=${camera}`;

  useEffect(() => {
    const ws = new WebSocket(url);
    ws.onopen = () => {
      pc.createOffer().then((offer) => {
        pc.setLocalDescription(offer).then(() => {
          const msg = { type: 'webrtc/offer', value: pc.localDescription.sdp };
          ws.send(JSON.stringify(msg));
        });
      });
    };
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);

      if (msg.type === 'webrtc/candidate') {
        pc.addIceCandidate({ candidate: msg.value, sdpMid: '0' });
      } else if (msg.type === 'webrtc/answer') {
        pc.setRemoteDescription({ type: 'answer', sdp: msg.value });
      }
    };

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    pc.onicecandidate = (ev) => {
      if (ev.candidate !== null) {
        ws.send(
          JSON.stringify({
            type: 'webrtc/candidate',
            value: ev.candidate.toJSON().candidate,
          })
        );
      }
    };
    pc.ontrack = (ev) => {
      const video = document.getElementById('video');

      // when audio track not exist in Chrome
      if (ev.streams.length === 0) return;
      // when audio track not exist in Firefox
      if (ev.streams[0].id[0] === '{') return;
      // when stream already init
      if (video.srcObject !== null) return;

      video.srcObject = ev.streams[0];
    };

    // Safari don't support "offerToReceiveVideo"
    // so need to create transeivers manually
    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });

    return () => {
      const video = document.getElementById('video');
      video.srcObject = null;
      pc.close();
      ws.close();
    };
  }, [url]);

  return (
    <div>
      <video id="video" autoplay playsinline controls muted width={width} height={height} />
    </div>
  );
}
