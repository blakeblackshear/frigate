import {
  MutableRefObject,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import Hls from "hls.js";
import { isDesktop, isMobile } from "react-device-detect";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import VideoControls from "./VideoControls";

const HLS_MIME_TYPE = "application/vnd.apple.mpegurl" as const;
const unsupportedErrorCodes = [
  MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED,
  MediaError.MEDIA_ERR_DECODE,
];

type HlsVideoPlayerProps = {
  className: string;
  children?: ReactNode;
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  visible: boolean;
  currentSource: string;
  onClipEnded?: () => void;
  onPlayerLoaded?: () => void;
  onTimeUpdate?: (time: number) => void;
  onPlaying?: () => void;
};
export default function HlsVideoPlayer({
  className,
  children,
  videoRef,
  visible,
  currentSource,
  onClipEnded,
  onPlayerLoaded,
  onTimeUpdate,
  onPlaying,
}: HlsVideoPlayerProps) {
  // playback

  const hlsRef = useRef<Hls>();
  const [useHlsCompat, setUseHlsCompat] = useState(false);
  const [loadedMetadata, setLoadedMetadata] = useState(false);

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    if (videoRef.current.canPlayType(HLS_MIME_TYPE)) {
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

  // controls

  const [isPlaying, setIsPlaying] = useState(true);
  const [mobileCtrlTimeout, setMobileCtrlTimeout] = useState<NodeJS.Timeout>();
  const [controls, setControls] = useState(isMobile);
  const [controlsOpen, setControlsOpen] = useState(false);

  return (
    <div
      className={`relative ${visible ? "visible" : "hidden"}`}
      onMouseOver={
        isDesktop
          ? () => {
              setControls(true);
            }
          : undefined
      }
      onMouseOut={
        isDesktop
          ? () => {
              setControls(controlsOpen);
            }
          : undefined
      }
      onClick={isDesktop ? undefined : () => setControls(!controls)}
    >
      <TransformWrapper minScale={1.0}>
        <TransformComponent>
          <video
            ref={videoRef}
            className={`${className ?? ""} bg-black rounded-2xl ${loadedMetadata ? "" : "invisible"}`}
            preload="auto"
            autoPlay
            controls={false}
            playsInline
            muted
            onPlay={() => {
              setIsPlaying(true);

              if (isMobile) {
                setControls(true);
                setMobileCtrlTimeout(
                  setTimeout(() => setControls(false), 4000),
                );
              }
            }}
            onPlaying={onPlaying}
            onPause={() => {
              setIsPlaying(false);

              if (isMobile && mobileCtrlTimeout) {
                clearTimeout(mobileCtrlTimeout);
              }
            }}
            onTimeUpdate={() =>
              onTimeUpdate && videoRef.current
                ? onTimeUpdate(videoRef.current.currentTime)
                : undefined
            }
            onLoadedData={onPlayerLoaded}
            onLoadedMetadata={() => setLoadedMetadata(true)}
            onEnded={onClipEnded}
            onError={(e) => {
              if (
                !hlsRef.current &&
                // @ts-expect-error code does exist
                unsupportedErrorCodes.includes(e.target.error.code) &&
                videoRef.current
              ) {
                setUseHlsCompat(true);
              }
            }}
          />
        </TransformComponent>
      </TransformWrapper>
      <VideoControls
        className="absolute bottom-5 left-1/2 -translate-x-1/2"
        video={videoRef.current}
        isPlaying={isPlaying}
        show={controls}
        controlsOpen={controlsOpen}
        setControlsOpen={setControlsOpen}
        onPlayPause={(play) => {
          if (!videoRef.current) {
            return;
          }

          if (play) {
            videoRef.current.play();
          } else {
            videoRef.current.pause();
          }
        }}
        onSeek={(diff) => {
          const currentTime = videoRef.current?.currentTime;

          if (!videoRef.current || !currentTime) {
            return;
          }

          videoRef.current.currentTime = Math.max(0, currentTime + diff);
        }}
      />
      {children}
    </div>
  );
}
