import {
  MutableRefObject,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import Hls from "hls.js";
import { isAndroid, isDesktop, isMobile } from "react-device-detect";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import VideoControls from "./VideoControls";

// Android native hls does not seek correctly
const USE_NATIVE_HLS = !isAndroid;
const HLS_MIME_TYPE = "application/vnd.apple.mpegurl" as const;
const unsupportedErrorCodes = [
  MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED,
  MediaError.MEDIA_ERR_DECODE,
];

type HlsVideoPlayerProps = {
  children?: ReactNode;
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  visible: boolean;
  currentSource: string;
  hotKeys: boolean;
  onClipEnded?: () => void;
  onPlayerLoaded?: () => void;
  onTimeUpdate?: (time: number) => void;
  onPlaying?: () => void;
};
export default function HlsVideoPlayer({
  children,
  videoRef,
  visible,
  currentSource,
  hotKeys,
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

  // controls

  const [isPlaying, setIsPlaying] = useState(true);
  const [mobileCtrlTimeout, setMobileCtrlTimeout] = useState<NodeJS.Timeout>();
  const [controls, setControls] = useState(isMobile);
  const [controlsOpen, setControlsOpen] = useState(false);

  return (
    <TransformWrapper minScale={1.0}>
      <TransformComponent
        wrapperStyle={{
          position: "relative",
          display: visible ? undefined : "none",
          width: "100%",
          height: "100%",
        }}
        contentStyle={{
          width: "100%",
          height: isMobile ? "100%" : undefined,
        }}
      >
        <video
          ref={videoRef}
          className={`size-full bg-black rounded-2xl ${loadedMetadata ? "" : "invisible"}`}
          preload="auto"
          autoPlay
          controls={false}
          playsInline
          muted
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
              setLoadedMetadata(false);
              setUseHlsCompat(true);
            }
          }}
        />
        <div
          className="absolute inset-0"
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
          <div className={`size-full relative ${visible ? "" : "hidden"}`}>
            <VideoControls
              className="absolute bottom-5 left-1/2 -translate-x-1/2"
              video={videoRef.current}
              isPlaying={isPlaying}
              show={controls}
              controlsOpen={controlsOpen}
              setControlsOpen={setControlsOpen}
              playbackRate={videoRef.current?.playbackRate ?? 1}
              hotKeys={hotKeys}
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
              onSetPlaybackRate={(rate) =>
                videoRef.current ? (videoRef.current.playbackRate = rate) : null
              }
            />
            {children}
          </div>
        </div>
      </TransformComponent>
    </TransformWrapper>
  );
}
