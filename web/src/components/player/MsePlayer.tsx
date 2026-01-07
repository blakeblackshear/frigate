import { baseUrl } from "@/api/baseUrl";
import { useUserPersistence } from "@/hooks/use-user-persistence";
import {
  LivePlayerError,
  PlayerStatsType,
  VideoResolutionType,
} from "@/types/live";
import {
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isIOS, isSafari } from "react-device-detect";

type MSEPlayerProps = {
  camera: string;
  className?: string;
  playbackEnabled?: boolean;
  audioEnabled?: boolean;
  volume?: number;
  playInBackground?: boolean;
  pip?: boolean;
  getStats?: boolean;
  setStats?: (stats: PlayerStatsType) => void;
  onPlaying?: () => void;
  setFullResolution?: React.Dispatch<SetStateAction<VideoResolutionType>>;
  onError?: (error: LivePlayerError) => void;
};

function MSEPlayer({
  camera,
  className,
  playbackEnabled = true,
  audioEnabled = false,
  volume,
  playInBackground = false,
  pip = false,
  getStats = false,
  setStats,
  onPlaying,
  setFullResolution,
  onError,
}: MSEPlayerProps) {
  const RECONNECT_TIMEOUT: number = 10000;
  const BUFFERING_COOLDOWN_TIMEOUT: number = 5000;

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
  const [isPlaying, setIsPlaying] = useState(false);
  const lastJumpTimeRef = useRef(0);

  const MAX_BUFFER_ENTRIES = 10; // Size of the rolling window  of buffered times
  const bufferTimes = useRef<number[]>([]);
  const bufferIndex = useRef(0);

  const [wsState, setWsState] = useState<number>(WebSocket.CLOSED);
  const [connectTS, setConnectTS] = useState<number>(0);
  const [bufferTimeout, setBufferTimeout] = useState<NodeJS.Timeout>();
  const [errorCount, setErrorCount] = useState<number>(0);
  const totalBytesLoaded = useRef(0);

  const [fallbackTimeout] = useUserPersistence<number>(
    "liveFallbackTimeout",
    3,
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTIDRef = useRef<number | null>(null);
  const intentionalDisconnectRef = useRef<boolean>(false);
  const ondataRef = useRef<((data: ArrayBufferLike) => void) | null>(null);
  const onmessageRef = useRef<{
    [key: string]: (msg: { value: string; type: string }) => void;
  }>({});
  const msRef = useRef<MediaSource | null>(null);
  const mseCodecRef = useRef<string | null>(null);
  const mseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mseResponseReceivedRef = useRef<boolean>(false);

  const wsURL = useMemo(() => {
    return `${baseUrl.replace(/^http/, "ws")}live/mse/api/ws?src=${camera}`;
  }, [camera]);

  const handleError = useCallback(
    (error: LivePlayerError, description: string = "Unknown error") => {
      // eslint-disable-next-line no-console
      console.error(
        `${camera} - MSE error '${error}': ${description} See the documentation: https://docs.frigate.video/configuration/live/#live-player-error-messages`,
      );

      if (mseCodecRef.current) {
        // eslint-disable-next-line no-console
        console.error(
          `${camera} - Browser negotiated codecs: ${mseCodecRef.current}`,
        );
        // eslint-disable-next-line no-console
        console.error(`${camera} - Supported codecs: ${CODECS.join(", ")}`);
      }
      onError?.(error);
    },
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [camera, onError],
  );

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
    if (!videoRef.current?.isConnected || !wsURL || wsRef.current) {
      return false;
    }

    intentionalDisconnectRef.current = false;
    setWsState(WebSocket.CONNECTING);

    setConnectTS(Date.now());

    wsRef.current = new WebSocket(wsURL);
    wsRef.current.binaryType = "arraybuffer";
    wsRef.current.addEventListener("open", onOpen);
    wsRef.current.addEventListener("close", onClose);
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsURL]);

  const onDisconnect = useCallback(() => {
    if (bufferTimeout) {
      clearTimeout(bufferTimeout);
      setBufferTimeout(undefined);
    }

    // Clear any pending MSE timeout
    if (mseTimeoutRef.current !== null) {
      clearTimeout(mseTimeoutRef.current);
      mseTimeoutRef.current = null;
    }

    // Clear any pending reconnect attempts
    if (reconnectTIDRef.current !== null) {
      clearTimeout(reconnectTIDRef.current);
      reconnectTIDRef.current = null;
    }

    setIsPlaying(false);

    if (wsRef.current) {
      const ws = wsRef.current;
      wsRef.current = null;
      const currentReadyState = ws.readyState;

      intentionalDisconnectRef.current = true;
      setWsState(WebSocket.CLOSED);

      // Remove event listeners to prevent them firing during close
      try {
        ws.removeEventListener("open", onOpen);
        ws.removeEventListener("close", onClose);
      } catch {
        // Ignore errors removing listeners
      }

      // Only call close() if the socket is OPEN or CLOSING
      // For CONNECTING or CLOSED sockets, just let it die
      if (
        currentReadyState === WebSocket.OPEN ||
        currentReadyState === WebSocket.CLOSING
      ) {
        try {
          ws.close();
        } catch {
          // Ignore close errors
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bufferTimeout]);

  const handlePause = useCallback(() => {
    // don't let the user pause the live stream
    if (isPlaying && playbackEnabled) {
      videoRef.current?.play();
    }
  }, [isPlaying, playbackEnabled]);

  const onOpen = useCallback(() => {
    // If we were marked for intentional disconnect while connecting, close immediately
    if (intentionalDisconnectRef.current) {
      wsRef.current?.close();
      wsRef.current = null;
      return;
    }

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

    // Reset the MSE response flag for this new connection
    mseResponseReceivedRef.current = false;

    // Create a fresh MediaSource for this connection to avoid stale sourceopen events
    // from previous connections interfering with this one
    const MediaSourceConstructor =
      "ManagedMediaSource" in window ? window.ManagedMediaSource : MediaSource;
    // @ts-expect-error for typing
    msRef.current = new MediaSourceConstructor();

    onMse();
    // onMse is defined below and stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reconnect = (timeout?: number) => {
    // Don't reconnect if intentional disconnect was flagged
    if (intentionalDisconnectRef.current) {
      return;
    }

    setWsState(WebSocket.CONNECTING);
    wsRef.current = null;

    const delay =
      timeout ?? Math.max(RECONNECT_TIMEOUT - (Date.now() - connectTS), 0);

    reconnectTIDRef.current = window.setTimeout(() => {
      reconnectTIDRef.current = null;
      onConnect();
    }, delay);
  };

  const onClose = useCallback(() => {
    // Don't reconnect if this was an intentional disconnect
    if (intentionalDisconnectRef.current) {
      // Reset the flag so future connects are allowed
      intentionalDisconnectRef.current = false;
      return;
    }

    if (wsState === WebSocket.CLOSED) return;
    reconnect();
    // reconnect is defined below and stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsState]);

  const sendWithTimeout = (value: object, timeout: number) => {
    return new Promise<void>((resolve, reject) => {
      // Don't start timeout if WS isn't connected - this can happen when
      // sourceopen fires from a previous connection after we've already disconnected
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        // Reject so caller knows this didn't work
        reject(new Error("WebSocket not connected"));
        return;
      }

      // If we've already received an MSE response for this connection, don't start another timeout
      if (mseResponseReceivedRef.current) {
        resolve();
        return;
      }

      // Clear any existing MSE timeout from a previous attempt
      if (mseTimeoutRef.current !== null) {
        clearTimeout(mseTimeoutRef.current);
        mseTimeoutRef.current = null;
      }

      const timeoutId = setTimeout(() => {
        // Only reject if we haven't received a response yet
        if (!mseResponseReceivedRef.current) {
          mseTimeoutRef.current = null;
          reject(new Error("Timeout waiting for response"));
        }
      }, timeout);

      mseTimeoutRef.current = timeoutId;

      // Override the onmessageRef handler for mse type to resolve the promise on response
      const originalHandler = onmessageRef.current["mse"];
      onmessageRef.current["mse"] = (msg) => {
        if (msg.type === "mse") {
          // Mark that we've received the response
          mseResponseReceivedRef.current = true;

          // Clear the timeout (use ref to clear the current one, not closure)
          if (mseTimeoutRef.current !== null) {
            clearTimeout(mseTimeoutRef.current);
            mseTimeoutRef.current = null;
          }

          // Call original handler in try-catch so errors don't prevent promise resolution
          if (originalHandler) {
            try {
              originalHandler(msg);
            } catch (e) {
              // Don't reject - we got the response, just let the error bubble
            }
          }

          resolve();
        }
      };

      send(value);
    });
  };

  const onMse = () => {
    if ("ManagedMediaSource" in window) {
      // safari
      const MediaSource = window.ManagedMediaSource;

      msRef.current?.addEventListener(
        "sourceopen",
        () => {
          sendWithTimeout(
            {
              type: "mse",
              // @ts-expect-error for typing
              value: codecs(MediaSource.isTypeSupported),
            },
            (fallbackTimeout ?? 3) * 1000,
          ).catch(() => {
            if (wsRef.current) {
              onDisconnect();
            }
            if (isIOS || isSafari) {
              handleError("mse-decode", "Safari cannot open MediaSource.");
            } else {
              handleError("startup", "Error opening MediaSource.");
            }
          });
        },
        { once: true },
      );

      if (videoRef.current) {
        videoRef.current.disableRemotePlayback = true;
        videoRef.current.srcObject = msRef.current;
      }
    } else {
      // non safari
      msRef.current?.addEventListener(
        "sourceopen",
        () => {
          URL.revokeObjectURL(videoRef.current?.src || "");
          sendWithTimeout(
            {
              type: "mse",
              value: codecs(MediaSource.isTypeSupported),
            },
            (fallbackTimeout ?? 3) * 1000,
          ).catch(() => {
            // Only report errors if we actually had a connection that failed
            // If WS wasn't connected, this is a stale sourceopen event from a previous connection
            if (wsRef.current) {
              onDisconnect();
              if (isIOS || isSafari) {
                handleError("mse-decode", "Safari cannot open MediaSource.");
              } else {
                handleError("startup", "Error opening MediaSource.");
              }
            }
          });
        },
        { once: true },
      );
      if (videoRef.current && msRef.current) {
        videoRef.current.src = URL.createObjectURL(msRef.current);
        videoRef.current.srcObject = null;
      }
    }
    play();

    onmessageRef.current["mse"] = (msg) => {
      if (msg.type !== "mse") return;

      // Store the codec value for error logging
      mseCodecRef.current = msg.value;

      let sb: SourceBuffer | undefined;
      try {
        sb = msRef.current?.addSourceBuffer(msg.value);
        if (sb?.mode) {
          sb.mode = "segments";
        }
      } catch (e) {
        // Safari sometimes throws this error
        if (e instanceof DOMException && e.name === "InvalidStateError") {
          if (wsRef.current) {
            onDisconnect();
          }
          handleError("mse-decode", "Safari reported InvalidStateError.");
          return;
        } else {
          throw e; // Re-throw if it's not the error we're handling
        }
      }

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
        totalBytesLoaded.current += data.byteLength;

        if (sb?.updating || bufLen > 0) {
          const b = new Uint8Array(data);
          buf.set(b, bufLen);
          bufLen += b.byteLength;
          // console.debug("VideoRTC.buffer", b.byteLength, bufLen);
        } else {
          try {
            sb?.appendBuffer(data as ArrayBuffer);
          } catch (e) {
            // no-op
          }
        }
      };
    };
  };

  const getBufferedTime = (video: HTMLVideoElement | null) => {
    if (!video || video.buffered.length === 0) return 0;
    return video.buffered.end(video.buffered.length - 1) - video.currentTime;
  };

  const jumpToLive = () => {
    if (!videoRef.current) return;

    const buffered = videoRef.current.buffered;
    if (buffered.length > 0) {
      const liveEdge = buffered.end(buffered.length - 1);
      // Jump to the live edge
      videoRef.current.currentTime = liveEdge - 0.75;
      lastJumpTimeRef.current = Date.now();
    }
  };

  const calculateAdaptiveBufferThreshold = () => {
    const filledEntries = bufferTimes.current.length;
    const sum = bufferTimes.current.reduce((a, b) => a + b, 0);
    const averageBufferTime = filledEntries ? sum / filledEntries : 0;
    return averageBufferTime * (isSafari || isIOS ? 3 : 1.5);
  };

  const calculateAdaptivePlaybackRate = (
    bufferTime: number,
    bufferThreshold: number,
  ) => {
    const alpha = 0.2; // aggressiveness of playback rate increase
    const beta = 0.5; // steepness of exponential growth

    // don't adjust playback rate if we're close enough to live
    // or if we just started streaming
    if (
      ((bufferTime <= bufferThreshold && bufferThreshold < 3) ||
        bufferTime < 3) &&
      bufferTimes.current.length <= MAX_BUFFER_ENTRIES
    ) {
      return 1;
    }
    const rate = 1 + alpha * Math.exp(beta * bufferTime - bufferThreshold);
    return Math.min(rate, 2);
  };

  const onProgress = useCallback(() => {
    const bufferTime = getBufferedTime(videoRef.current);

    if (
      videoRef.current &&
      (videoRef.current.playbackRate === 1 || bufferTime < 3)
    ) {
      if (bufferTimes.current.length < MAX_BUFFER_ENTRIES) {
        bufferTimes.current.push(bufferTime);
      } else {
        bufferTimes.current[bufferIndex.current] = bufferTime;
        bufferIndex.current = (bufferIndex.current + 1) % MAX_BUFFER_ENTRIES;
      }
    }

    const bufferThreshold = calculateAdaptiveBufferThreshold();

    // if we have > 3 seconds of buffered data and we're still not playing,
    // something might be wrong - maybe codec issue, no audio, etc
    // so mark the player as playing so that error handlers will fire
    if (!isPlaying && playbackEnabled && bufferTime > 3) {
      setIsPlaying(true);
      lastJumpTimeRef.current = Date.now();
      onPlaying?.();
    }

    // if we have more than 10 seconds of buffer, something's wrong so error out
    if (
      isPlaying &&
      playbackEnabled &&
      (bufferThreshold > 10 || bufferTime > 10)
    ) {
      onDisconnect();
      handleError(
        "stalled",
        "Buffer time (10 seconds) exceeded, browser may not be playing media correctly.",
      );
    }

    const playbackRate = calculateAdaptivePlaybackRate(
      bufferTime,
      bufferThreshold,
    );

    // if we're above our rolling average threshold or have > 3 seconds of
    // buffered data and we're playing, we may have drifted from actual live
    // time
    if (videoRef.current && isPlaying && playbackEnabled) {
      if (
        (isSafari || isIOS) &&
        bufferTime > 3 &&
        Date.now() - lastJumpTimeRef.current > BUFFERING_COOLDOWN_TIMEOUT
      ) {
        // Jump to live on Safari/iOS due to a change of playback rate causing re-buffering
        jumpToLive();
      } else {
        // increase/decrease playback rate to compensate - non Safari/iOS only
        if (videoRef.current.playbackRate !== playbackRate) {
          videoRef.current.playbackRate = playbackRate;
        }
      }
    }

    if (onError != undefined) {
      if (videoRef.current?.paused) {
        return;
      }

      if (bufferTimeout) {
        clearTimeout(bufferTimeout);
        setBufferTimeout(undefined);
      }

      const timeoutDuration =
        bufferTime == 0
          ? (fallbackTimeout ?? 3) * 2 * 1000
          : (fallbackTimeout ?? 3) * 1000;
      setBufferTimeout(
        setTimeout(() => {
          if (
            document.visibilityState === "visible" &&
            wsRef.current != null &&
            videoRef.current
          ) {
            onDisconnect();
            handleError(
              "stalled",
              `Media playback has stalled after ${timeoutDuration / 1000} seconds due to insufficient buffering or a network interruption.`,
            );
          }
        }, timeoutDuration),
      );
    }
  }, [
    bufferTimeout,
    isPlaying,
    onDisconnect,
    handleError,
    onError,
    onPlaying,
    playbackEnabled,
    fallbackTimeout,
  ]);

  useEffect(() => {
    if (!playbackEnabled) {
      return;
    }

    onConnect();

    return () => {
      onDisconnect();
    };
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackEnabled]);

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

    if (!playInBackground) {
      document.addEventListener("visibilitychange", listener);
    }

    return () => {
      if (!playInBackground) {
        document.removeEventListener("visibilitychange", listener);
      }
    };
  }, [
    playbackEnabled,
    visibilityCheck,
    playInBackground,
    onConnect,
    onDisconnect,
  ]);

  // control pip

  useEffect(() => {
    if (!videoRef.current || !pip) {
      return;
    }

    videoRef.current.requestPictureInPicture();
  }, [pip, videoRef]);

  // control volume

  useEffect(() => {
    if (!videoRef.current || volume == undefined) {
      return;
    }

    videoRef.current.volume = volume;
  }, [volume, videoRef]);

  // ensure we disconnect for slower connections

  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && !playbackEnabled) {
      if (bufferTimeout) {
        clearTimeout(bufferTimeout);
        setBufferTimeout(undefined);
      }

      setTimeout(() => {
        if (!playbackEnabled) onDisconnect();
      }, 10000);
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackEnabled]);

  // stats

  useEffect(() => {
    const video = videoRef.current;
    let lastLoadedBytes = totalBytesLoaded.current;
    let lastTimestamp = Date.now();

    if (!getStats) return;

    const updateStats = () => {
      if (video) {
        const now = Date.now();
        const bytesLoaded = totalBytesLoaded.current;
        const timeElapsed = (now - lastTimestamp) / 1000; // seconds
        const bandwidth = (bytesLoaded - lastLoadedBytes) / timeElapsed / 1000; // kBps

        lastLoadedBytes = bytesLoaded;
        lastTimestamp = now;

        const latency =
          video.seekable.length > 0
            ? Math.max(
                0,
                video.seekable.end(video.seekable.length - 1) -
                  video.currentTime,
              )
            : 0;

        const videoQuality = video.getVideoPlaybackQuality();
        const { totalVideoFrames, droppedVideoFrames } = videoQuality;
        const droppedFrameRate = totalVideoFrames
          ? (droppedVideoFrames / totalVideoFrames) * 100
          : 0;

        setStats?.({
          streamType: "MSE",
          bandwidth,
          latency,
          totalFrames: totalVideoFrames,
          droppedFrames: droppedVideoFrames || undefined,
          decodedFrames: totalVideoFrames - droppedVideoFrames,
          droppedFrameRate,
        });
      }
    };

    const interval = setInterval(updateStats, 1000); // Update every second

    return () => {
      clearInterval(interval);
      setStats?.({
        streamType: "-",
        bandwidth: 0,
        latency: undefined,
        totalFrames: 0,
        droppedFrames: undefined,
        decodedFrames: 0,
        droppedFrameRate: 0,
      });
    };
  }, [setStats, getStats]);

  return (
    <video
      ref={videoRef}
      className={className}
      playsInline
      preload="auto"
      onLoadedData={() => {
        handleLoadedMetadata?.();
        onPlaying?.();
        setIsPlaying(true);
        lastJumpTimeRef.current = Date.now();
      }}
      muted={!audioEnabled}
      onPause={handlePause}
      onProgress={onProgress}
      onError={(e) => {
        if (
          // @ts-expect-error code does exist
          e.target.error.code == MediaError.MEDIA_ERR_NETWORK
        ) {
          if (wsRef.current) {
            onDisconnect();
          }
          handleError("startup", "Browser reported a network error.");
        }

        if (
          // @ts-expect-error code does exist
          e.target.error.code == MediaError.MEDIA_ERR_DECODE &&
          (isSafari || isIOS)
        ) {
          if (wsRef.current) {
            onDisconnect();
          }
          handleError("mse-decode", "Safari reported decoding errors.");
        }

        setErrorCount((prevCount) => prevCount + 1);

        if (wsRef.current) {
          onDisconnect();
          if (errorCount >= 3) {
            // too many mse errors, try jsmpeg
            handleError("startup", `Max error count ${errorCount} exceeded.`);
          } else {
            reconnect(5000);
          }
        }
      }}
    />
  );
}

export default MSEPlayer;
