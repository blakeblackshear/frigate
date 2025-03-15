import {
  MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Hls from "hls.js";
import { isAndroid, isDesktop, isMobile } from "react-device-detect";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import VideoControls from "./VideoControls";
import { VideoResolutionType } from "@/types/live";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { AxiosResponse } from "axios";
import { toast } from "sonner";
import { useOverlayState } from "@/hooks/use-overlay-state";
import { usePersistence } from "@/hooks/use-persistence";
import { cn } from "@/lib/utils";
import { ASPECT_VERTICAL_LAYOUT, RecordingPlayerError } from "@/types/record";
import { useTranslation } from "react-i18next";

// Android native hls does not seek correctly
const USE_NATIVE_HLS = !isAndroid;
const HLS_MIME_TYPE = "application/vnd.apple.mpegurl" as const;
const unsupportedErrorCodes = [
  MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED,
  MediaError.MEDIA_ERR_DECODE,
];

type HlsVideoPlayerProps = {
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  containerRef?: React.MutableRefObject<HTMLDivElement | null>;
  visible: boolean;
  currentSource: string;
  hotKeys: boolean;
  supportsFullscreen: boolean;
  fullscreen: boolean;
  frigateControls?: boolean;
  onClipEnded?: () => void;
  onPlayerLoaded?: () => void;
  onTimeUpdate?: (time: number) => void;
  onPlaying?: () => void;
  setFullResolution?: React.Dispatch<React.SetStateAction<VideoResolutionType>>;
  onUploadFrame?: (playTime: number) => Promise<AxiosResponse> | undefined;
  toggleFullscreen?: () => void;
  onError?: (error: RecordingPlayerError) => void;
};
export default function HlsVideoPlayer({
  videoRef,
  containerRef,
  visible,
  currentSource,
  hotKeys,
  supportsFullscreen,
  fullscreen,
  frigateControls = true,
  onClipEnded,
  onPlayerLoaded,
  onTimeUpdate,
  onPlaying,
  setFullResolution,
  onUploadFrame,
  toggleFullscreen,
  onError,
}: HlsVideoPlayerProps) {
  const { t } = useTranslation("components/player");
  const { data: config } = useSWR<FrigateConfig>("config");

  // playback

  const hlsRef = useRef<Hls>();
  const [useHlsCompat, setUseHlsCompat] = useState(false);
  const [loadedMetadata, setLoadedMetadata] = useState(false);
  const [bufferTimeout, setBufferTimeout] = useState<NodeJS.Timeout>();

  const handleLoadedMetadata = useCallback(() => {
    setLoadedMetadata(true);
    if (videoRef.current) {
      if (setFullResolution) {
        setFullResolution({
          width: videoRef.current.videoWidth,
          height: videoRef.current.videoHeight,
        });
      }

      setTallCamera(
        videoRef.current.videoWidth / videoRef.current.videoHeight <
          ASPECT_VERTICAL_LAYOUT,
      );
    }
  }, [videoRef, setFullResolution]);

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    if (USE_NATIVE_HLS && videoRef.current.canPlayType(HLS_MIME_TYPE)) {
      return;
    } else if (Hls.isSupported()) {
      setUseHlsCompat(true);
    }
  }, [videoRef]);

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    const currentPlaybackRate = videoRef.current.playbackRate;

    if (!useHlsCompat) {
      videoRef.current.src = currentSource;
      videoRef.current.load();
      return;
    }

    if (!hlsRef.current) {
      hlsRef.current = new Hls();
      hlsRef.current.attachMedia(videoRef.current);
    }

    hlsRef.current.loadSource(currentSource);
    videoRef.current.playbackRate = currentPlaybackRate;
  }, [videoRef, hlsRef, useHlsCompat, currentSource]);

  // state handling

  const onPlayPause = useCallback(
    (play: boolean) => {
      if (!videoRef.current) {
        return;
      }

      if (play) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    },
    [videoRef],
  );

  // controls

  const [tallCamera, setTallCamera] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [muted, setMuted] = usePersistence("hlsPlayerMuted", true);
  const [volume, setVolume] = useOverlayState("playerVolume", 1.0);
  const [defaultPlaybackRate] = usePersistence("playbackRate", 1);
  const [playbackRate, setPlaybackRate] = useOverlayState(
    "playbackRate",
    defaultPlaybackRate ?? 1,
  );
  const [mobileCtrlTimeout, setMobileCtrlTimeout] = useState<NodeJS.Timeout>();
  const [controls, setControls] = useState(isMobile);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1.0);

  useEffect(() => {
    if (!isDesktop) {
      return;
    }

    const callback = (e: MouseEvent) => {
      if (!videoRef.current) {
        return;
      }

      const rect = videoRef.current.getBoundingClientRect();

      if (
        e.clientX > rect.left &&
        e.clientX < rect.right &&
        e.clientY > rect.top &&
        e.clientY < rect.bottom
      ) {
        setControls(true);
      } else {
        setControls(controlsOpen);
      }
    };
    window.addEventListener("mousemove", callback);
    return () => {
      window.removeEventListener("mousemove", callback);
    };
  }, [videoRef, controlsOpen]);

  return (
    <TransformWrapper
      minScale={1.0}
      wheel={{ smoothStep: 0.005 }}
      onZoom={(zoom) => setZoomScale(zoom.state.scale)}
      disabled={!frigateControls}
    >
      {frigateControls && (
        <VideoControls
          className={cn(
            "absolute left-1/2 z-50 -translate-x-1/2",
            tallCamera ? "bottom-12" : "bottom-5",
          )}
          video={videoRef.current}
          isPlaying={isPlaying}
          show={visible && (controls || controlsOpen)}
          muted={muted}
          volume={volume}
          features={{
            volume: true,
            seek: true,
            playbackRate: true,
            plusUpload: config?.plus?.enabled == true,
            fullscreen: supportsFullscreen,
          }}
          setControlsOpen={setControlsOpen}
          setMuted={(muted) => setMuted(muted)}
          playbackRate={playbackRate ?? 1}
          hotKeys={hotKeys}
          onPlayPause={onPlayPause}
          onSeek={(diff) => {
            const currentTime = videoRef.current?.currentTime;

            if (!videoRef.current || !currentTime) {
              return;
            }

            videoRef.current.currentTime = Math.max(0, currentTime + diff);
          }}
          onSetPlaybackRate={(rate) => {
            setPlaybackRate(rate, true);

            if (videoRef.current) {
              videoRef.current.playbackRate = rate;
            }
          }}
          onUploadFrame={async () => {
            if (videoRef.current && onUploadFrame) {
              const resp = await onUploadFrame(videoRef.current.currentTime);

              if (resp && resp.status == 200) {
                toast.success(t("toast.success.submittedFrigatePlus"), {
                  position: "top-center",
                });
              } else {
                toast.success(t("toast.error.submitFrigatePlusFailed"), {
                  position: "top-center",
                });
              }
            }
          }}
          fullscreen={fullscreen}
          toggleFullscreen={toggleFullscreen}
          containerRef={containerRef}
        />
      )}
      <TransformComponent
        wrapperStyle={{
          display: visible ? undefined : "none",
          width: "100%",
          height: "100%",
        }}
        wrapperProps={{
          onClick: isDesktop ? undefined : () => setControls(!controls),
        }}
        contentStyle={{
          width: "100%",
          height: isMobile ? "100%" : undefined,
        }}
      >
        <video
          ref={videoRef}
          className={`size-full rounded-lg bg-black md:rounded-2xl ${loadedMetadata ? "" : "invisible"} cursor-pointer`}
          preload="auto"
          autoPlay
          controls={!frigateControls}
          playsInline
          muted={muted}
          onClick={
            isDesktop
              ? () => {
                  if (zoomScale == 1.0) onPlayPause(!isPlaying);
                }
              : undefined
          }
          onVolumeChange={() => {
            setVolume(videoRef.current?.volume ?? 1.0, true);
            if (!frigateControls) {
              setMuted(videoRef.current?.muted);
            }
          }}
          onPlay={() => {
            setIsPlaying(true);

            if (isMobile) {
              setControls(true);
              setMobileCtrlTimeout(setTimeout(() => setControls(false), 4000));
            }
          }}
          onPlaying={onPlaying}
          onPause={() => {
            setIsPlaying(false);
            clearTimeout(bufferTimeout);

            if (isMobile && mobileCtrlTimeout) {
              clearTimeout(mobileCtrlTimeout);
            }
          }}
          onWaiting={() => {
            if (onError != undefined) {
              if (videoRef.current?.paused) {
                return;
              }

              setBufferTimeout(
                setTimeout(() => {
                  if (
                    document.visibilityState === "visible" &&
                    videoRef.current
                  ) {
                    onError("stalled");
                  }
                }, 3000),
              );
            }
          }}
          onProgress={() => {
            if (onError != undefined) {
              if (videoRef.current?.paused) {
                return;
              }

              if (bufferTimeout) {
                clearTimeout(bufferTimeout);
                setBufferTimeout(undefined);
              }
            }
          }}
          onTimeUpdate={() =>
            onTimeUpdate && videoRef.current
              ? onTimeUpdate(videoRef.current.currentTime)
              : undefined
          }
          onLoadedData={() => {
            onPlayerLoaded?.();
            handleLoadedMetadata();

            if (videoRef.current) {
              if (playbackRate) {
                videoRef.current.playbackRate = playbackRate;
              }

              if (volume) {
                videoRef.current.volume = volume;
              }
            }
          }}
          onEnded={onClipEnded}
          onError={(e) => {
            if (
              !hlsRef.current &&
              // @ts-expect-error code does exist
              unsupportedErrorCodes.includes(e.target.error.code) &&
              videoRef.current
            ) {
              setLoadedMetadata(false);
              setUseHlsCompat(true);
            } else {
              toast.error(
                // @ts-expect-error code does exist
                `Failed to play recordings (error ${e.target.error.code}): ${e.target.error.message}`,
                {
                  position: "top-center",
                },
              );
            }
          }}
        />
      </TransformComponent>
    </TransformWrapper>
  );
}
