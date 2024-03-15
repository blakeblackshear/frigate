import { baseUrl } from "@/api/baseUrl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type WebRtcPlayerProps = {
  className?: string;
  camera: string;
  playbackEnabled?: boolean;
  audioEnabled?: boolean;
  microphoneEnabled?: boolean;
  iOSCompatFullScreen?: boolean; // ios doesn't support fullscreen divs so we must support the video element
  onPlaying?: () => void;
};

export default function WebRtcPlayer({
  className,
  camera,
  playbackEnabled = true,
  audioEnabled = false,
  microphoneEnabled = false,
  iOSCompatFullScreen = false,
  onPlaying,
}: WebRtcPlayerProps) {
  // metadata

  const wsURL = useMemo(() => {
    return `${baseUrl.replace(/^http/, "ws")}live/webrtc/api/ws?src=${camera}`;
  }, [camera]);

  // camera states

  const pcRef = useRef<RTCPeerConnection | undefined>();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const PeerConnection = useCallback(
    async (media: string) => {
      if (!videoRef.current) {
        return;
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      const localTracks = [];

      if (/camera|microphone/.test(media)) {
        const tracks = await getMediaTracks("user", {
          video: media.indexOf("camera") >= 0,
          audio: media.indexOf("microphone") >= 0,
        });
        tracks.forEach((track) => {
          pc.addTransceiver(track, { direction: "sendonly" });
          if (track.kind === "video") localTracks.push(track);
        });
      }

      if (media.indexOf("display") >= 0) {
        const tracks = await getMediaTracks("display", {
          video: true,
          audio: media.indexOf("speaker") >= 0,
        });
        tracks.forEach((track) => {
          pc.addTransceiver(track, { direction: "sendonly" });
          if (track.kind === "video") localTracks.push(track);
        });
      }

      if (/video|audio/.test(media)) {
        const tracks = ["video", "audio"]
          .filter((kind) => media.indexOf(kind) >= 0)
          .map(
            (kind) =>
              pc.addTransceiver(kind, { direction: "recvonly" }).receiver.track,
          );
        localTracks.push(...tracks);
      }

      videoRef.current.srcObject = new MediaStream(localTracks);
      return pc;
    },
    [videoRef],
  );

  async function getMediaTracks(
    media: string,
    constraints: MediaStreamConstraints,
  ) {
    try {
      const stream =
        media === "user"
          ? await navigator.mediaDevices.getUserMedia(constraints)
          : await navigator.mediaDevices.getDisplayMedia(constraints);
      return stream.getTracks();
    } catch (e) {
      return [];
    }
  }

  const connect = useCallback(
    async (aPc: Promise<RTCPeerConnection | undefined>) => {
      if (!aPc) {
        return;
      }

      pcRef.current = await aPc;
      const ws = new WebSocket(wsURL);

      ws.addEventListener("open", () => {
        pcRef.current?.addEventListener("icecandidate", (ev) => {
          if (!ev.candidate) return;
          const msg = {
            type: "webrtc/candidate",
            value: ev.candidate.candidate,
          };
          ws.send(JSON.stringify(msg));
        });

        pcRef.current
          ?.createOffer()
          .then((offer) => pcRef.current?.setLocalDescription(offer))
          .then(() => {
            const msg = {
              type: "webrtc/offer",
              value: pcRef.current?.localDescription?.sdp,
            };
            ws.send(JSON.stringify(msg));
          });
      });

      ws.addEventListener("message", (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.type === "webrtc/candidate") {
          pcRef.current?.addIceCandidate({ candidate: msg.value, sdpMid: "0" });
        } else if (msg.type === "webrtc/answer") {
          pcRef.current?.setRemoteDescription({
            type: "answer",
            sdp: msg.value,
          });
        }
      });
    },
    [wsURL],
  );

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    if (!playbackEnabled) {
      return;
    }

    const aPc = PeerConnection(
      microphoneEnabled ? "video+audio+microphone" : "video+audio",
    );
    connect(aPc);

    return () => {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = undefined;
      }
    };
  }, [
    camera,
    connect,
    PeerConnection,
    pcRef,
    videoRef,
    playbackEnabled,
    microphoneEnabled,
  ]);

  // ios compat
  const [iOSCompatControls, setiOSCompatControls] = useState(false);

  return (
    <video
      ref={videoRef}
      className={className}
      controls={iOSCompatControls}
      autoPlay
      playsInline
      muted={!audioEnabled}
      onLoadedData={onPlaying}
      onClick={
        iOSCompatFullScreen
          ? () => setiOSCompatControls(!iOSCompatControls)
          : undefined
      }
    />
  );
}
