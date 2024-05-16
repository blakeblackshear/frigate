import { baseUrl } from "@/api/baseUrl";
import { VideoResolutionType } from "@/types/live";
import {
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type MSEPlayerProps = {
  camera: string;
  className?: string;
  playbackEnabled?: boolean;
  audioEnabled?: boolean;
  pip?: boolean;
  onPlaying?: () => void;
  setFullResolution?: React.Dispatch<SetStateAction<VideoResolutionType>>;
};

function MSEPlayer({
  camera,
  className,
  playbackEnabled = true,
  audioEnabled = false,
  pip = false,
  onPlaying,
  setFullResolution,
}: MSEPlayerProps) {
  let connectTS: number = 0;

  const RECONNECT_TIMEOUT: number = 30000;

  const CODECS: string[] = [
    "avc1.640029", // H.264 high 4.1 (Chromecast 1st and 2nd Gen)
    "avc1.64002A", // H.264 high 4.2 (Chromecast 3rd Gen)
    "avc1.640033", // H.264 high 5.1 (Chromecast with Google TV)
    "hvc1.1.6.L153.B0", // H.265 main 5.1 (Chromecast Ultra)
    "mp4a.40.2", // AAC LC
    "mp4a.40.5", // AAC HE
    "flac", // FLAC (PCM compatible)
    "opus", // OPUS Chrome, Firefox
  ];

  const visibilityCheck: boolean = !pip;

  const [wsState, setWsState] = useState<number>(WebSocket.CLOSED);

  const videoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTIDRef = useRef<number | null>(null);
  const ondataRef = useRef<((data: ArrayBufferLike) => void) | null>(null);
  const onmessageRef = useRef<{
    [key: string]: (msg: { value: string; type: string }) => void;
  }>({});
  const msRef = useRef<MediaSource | null>(null);

  const wsURL = useMemo(() => {
    return `${baseUrl.replace(/^http/, "ws")}live/mse/api/ws?src=${camera}`;
  }, [camera]);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current && setFullResolution) {
      setFullResolution({
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
      });
    }
  }, [setFullResolution]);

  const play = () => {
    const currentVideo = videoRef.current;

    if (currentVideo) {
      currentVideo.play().catch((er: { name: string }) => {
        if (er.name === "NotAllowedError" && !currentVideo.muted) {
          currentVideo.muted = true;
          currentVideo.play().catch(() => {});
        }
      });
    }
  };

  const send = useCallback(
    (value: object) => {
      if (wsRef.current) wsRef.current.send(JSON.stringify(value));
    },
    [wsRef],
  );

  const codecs = useCallback((isSupported: (type: string) => boolean) => {
    return CODECS.filter((codec) =>
      isSupported(`video/mp4; codecs="${codec}"`),
    ).join();

    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onConnect = useCallback(() => {
    if (!videoRef.current?.isConnected || !wsURL || wsRef.current) return false;

    setWsState(WebSocket.CONNECTING);

    // TODO may need to check this later
    // eslint-disable-next-line
    connectTS = Date.now();

    wsRef.current = new WebSocket(wsURL);
    wsRef.current.binaryType = "arraybuffer";
    wsRef.current.addEventListener("open", () => onOpen());
    wsRef.current.addEventListener("close", () => onClose());
  }, [wsURL]);

  const onDisconnect = useCallback(() => {
    setWsState(WebSocket.CLOSED);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const onOpen = useCallback(() => {
    setWsState(WebSocket.OPEN);

    wsRef.current?.addEventListener("message", (ev) => {
      if (typeof ev.data === "string") {
        const msg = JSON.parse(ev.data);
        for (const mode in onmessageRef.current) {
          onmessageRef.current[mode](msg);
        }
      } else {
        ondataRef.current?.(ev.data);
      }
    });

    ondataRef.current = null;
    onmessageRef.current = {};

    onMse();
    // only run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onClose = useCallback(() => {
    if (wsState === WebSocket.CLOSED) return;

    setWsState(WebSocket.CONNECTING);
    wsRef.current = null;

    const delay = Math.max(RECONNECT_TIMEOUT - (Date.now() - connectTS), 0);

    reconnectTIDRef.current = window.setTimeout(() => {
      reconnectTIDRef.current = null;
      onConnect();
    }, delay);
  }, [wsState, connectTS, onConnect]);

  const onMse = () => {
    if ("ManagedMediaSource" in window) {
      const MediaSource = window.ManagedMediaSource;

      msRef.current?.addEventListener(
        "sourceopen",
        () => {
          send({
            type: "mse",
            // @ts-expect-error for typing
            value: codecs(MediaSource.isTypeSupported),
          });
        },
        { once: true },
      );

      if (videoRef.current) {
        videoRef.current.disableRemotePlayback = true;
        videoRef.current.srcObject = msRef.current;
      }
    } else {
      msRef.current?.addEventListener(
        "sourceopen",
        () => {
          URL.revokeObjectURL(videoRef.current?.src || "");
          send({
            type: "mse",
            value: codecs(MediaSource.isTypeSupported),
          });
        },
        { once: true },
      );
      videoRef.current!.src = URL.createObjectURL(msRef.current!);
      videoRef.current!.srcObject = null;
    }
    play();

    onmessageRef.current["mse"] = (msg) => {
      if (msg.type !== "mse") return;

      const sb = msRef.current?.addSourceBuffer(msg.value);
      sb?.addEventListener("updateend", () => {
        if (sb.updating) return;

        try {
          if (bufLen > 0) {
            const data = buf.slice(0, bufLen);
            bufLen = 0;
            sb.appendBuffer(data);
          } else if (sb.buffered && sb.buffered.length) {
            const end = sb.buffered.end(sb.buffered.length - 1) - 15;
            const start = sb.buffered.start(0);
            if (end > start) {
              sb.remove(start, end);
              msRef.current?.setLiveSeekableRange(end, end + 15);
            }
          }
        } catch (e) {
          // no-op
        }
      });

      const buf = new Uint8Array(2 * 1024 * 1024);
      let bufLen = 0;

      ondataRef.current = (data) => {
        if (sb?.updating || bufLen > 0) {
          const b = new Uint8Array(data);
          buf.set(b, bufLen);
          bufLen += b.byteLength;
          // console.debug("VideoRTC.buffer", b.byteLength, bufLen);
        } else {
          try {
            sb?.appendBuffer(data);
          } catch (e) {
            // no-op
          }
        }
      };
    };
  };

  useEffect(() => {
    if (!playbackEnabled) {
      return;
    }

    // iOS 17.1+ uses ManagedMediaSource
    const MediaSourceConstructor =
      "ManagedMediaSource" in window ? window.ManagedMediaSource : MediaSource;

    // @ts-expect-error for typing
    msRef.current = new MediaSourceConstructor();

    onConnect();

    return () => {
      onDisconnect();
    };
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackEnabled, onDisconnect, onConnect]);

  // check visibility

  useEffect(() => {
    if (!playbackEnabled || !visibilityCheck) {
      return;
    }

    if (!("hidden" in document)) {
      return;
    }

    const listener = () => {
      if (document.hidden) {
        onDisconnect();
      } else if (videoRef.current?.isConnected) {
        onConnect();
      }
    };

    document.addEventListener("visibilitychange", listener);

    return () => {
      document.removeEventListener("visibilitychange", listener);
    };
  }, [playbackEnabled, visibilityCheck, onConnect, onDisconnect]);

  // control pip

  useEffect(() => {
    if (!videoRef.current || !pip) {
      return;
    }

    videoRef.current.requestPictureInPicture();
  }, [pip, videoRef]);

  return (
    <video
      ref={videoRef}
      className={className}
      playsInline
      preload="auto"
      onLoadedData={onPlaying}
      onLoadedMetadata={handleLoadedMetadata}
      muted={!audioEnabled}
      onError={onClose}
    />
  );
}

export default MSEPlayer;
