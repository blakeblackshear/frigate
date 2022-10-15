import { h } from 'preact';
import { useRef, useEffect } from 'preact/hooks';

export default function WebRtcPlayer({ camera }) {
  const playerRef = useRef();

  useEffect(() => {
    let ws = new WebSocket('ws://192.168.50.106:1984/api/ws');
    ws.onopen = () => {

    };

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    pc.onicecandidate = ev => {
      if (ev.candidate !== null) {
        ws.send(JSON.stringify({
          type: 'webrtc/candidate', value: ev.candidate.toJSON().candidate,
        }));
      }
    }
    pc.ontrack = ev => {
      const video = document.getElementById('video');

      // when audio track not exist in Chrome
      if (ev.streams.length === 0) return;

      // when audio track not exist in Firefox
      if (ev.streams[0].id[0] === '{') return;

      // when stream already init
      if (video.srcObject !== null) return;

      video.srcObject = ev.streams[0];
    }

    // Safari don't support "offerToReceiveVideo"
    // so need to create transeivers manually
    pc.addTransceiver('video', {direction: 'recvonly'});
    pc.addTransceiver('audio', {direction: 'recvonly'});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <video id='video' ref={playerRef} autoplay playsinline controls muted />
    </div>
  );
}