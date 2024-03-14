import {
  MutableRefObject,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Hls from "hls.js";
import { isDesktop, isMobile, isSafari } from "react-device-detect";
import { LuPause, LuPlay } from "react-icons/lu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  MdForward10,
  MdReplay10,
  MdVolumeDown,
  MdVolumeMute,
  MdVolumeOff,
  MdVolumeUp,
} from "react-icons/md";
import useKeyboardListener from "@/hooks/use-keyboard-listener";
import { Slider } from "../ui/slider-volume";

const HLS_MIME_TYPE = "application/vnd.apple.mpegurl" as const;
const unsupportedErrorCodes = [
  MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED,
  MediaError.MEDIA_ERR_DECODE,
];

type HlsVideoPlayerProps = {
  className: string;
  children?: ReactNode;
  videoRef: MutableRefObject<HTMLVideoElement | null>;
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
  currentSource,
  onClipEnded,
  onPlayerLoaded,
  onTimeUpdate,
  onPlaying,
}: HlsVideoPlayerProps) {
  // playback

  const hlsRef = useRef<Hls>();
  const [useHlsCompat, setUseHlsCompat] = useState(false);

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

  const onKeyboardShortcut = useCallback(
    (key: string, down: boolean, repeat: boolean) => {
      if (!videoRef.current) {
        return;
      }

      switch (key) {
        case "ArrowLeft":
          if (down) {
            const currentTime = videoRef.current.currentTime;

            if (currentTime) {
              videoRef.current.currentTime = Math.max(0, currentTime - 5);
            }
          }
          break;
        case "ArrowRight":
          if (down) {
            const currentTime = videoRef.current.currentTime;

            if (currentTime) {
              videoRef.current.currentTime = currentTime + 5;
            }
          }
          break;
        case "m":
          if (down && !repeat && videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
          }
          break;
        case " ":
          if (down && videoRef.current) {
            if (videoRef.current.paused) {
              videoRef.current.play();
            } else {
              videoRef.current.pause();
            }
          }
          break;
      }
    },
    // only update when preview only changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [videoRef.current],
  );
  useKeyboardListener(
    ["ArrowLeft", "ArrowRight", "m", " "],
    onKeyboardShortcut,
  );

  return (
    <div
      className={`relative ${className ?? ""}`}
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
      <video
        ref={videoRef}
        className="size-full rounded-2xl"
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
      <VideoControls
        video={videoRef.current}
        isPlaying={isPlaying}
        show={controls}
        controlsOpen={controlsOpen}
        setControlsOpen={setControlsOpen}
      />
      {children}
    </div>
  );
}

type VideoControlsProps = {
  video: HTMLVideoElement | null;
  isPlaying: boolean;
  show: boolean;
  controlsOpen: boolean;
  setControlsOpen: (open: boolean) => void;
};
function VideoControls({
  video,
  isPlaying,
  show,
  controlsOpen,
  setControlsOpen,
}: VideoControlsProps) {
  const playbackRates = useMemo(() => {
    if (isSafari) {
      return [0.5, 1, 2];
    } else {
      return [0.5, 1, 2, 4, 8, 16];
    }
  }, []);

  const onReplay = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();

      const currentTime = video?.currentTime;

      if (!video || !currentTime) {
        return;
      }

      video.currentTime = Math.max(0, currentTime - 10);
    },
    [video],
  );

  const onSkip = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();

      const currentTime = video?.currentTime;

      if (!video || !currentTime) {
        return;
      }

      video.currentTime = currentTime + 10;
    },
    [video],
  );

  const onTogglePlay = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();

      if (!video) {
        return;
      }

      if (isPlaying) {
        video.pause();
      } else {
        video.play();
      }
    },
    [isPlaying, video],
  );

  // volume control

  const VolumeIcon = useMemo(() => {
    if (!video || video?.muted) {
      return MdVolumeOff;
    } else if (video.volume <= 0.33) {
      return MdVolumeMute;
    } else if (video.volume <= 0.67) {
      return MdVolumeDown;
    } else {
      return MdVolumeUp;
    }
    // only update when specific fields change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.volume, video?.muted]);

  if (!video || !show) {
    return;
  }

  return (
    <div
      className={`absolute bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 flex justify-between items-center gap-8 text-white z-50 bg-black bg-opacity-60 rounded-lg`}
    >
      <div className="flex justify-normal items-center gap-2">
        <VolumeIcon
          className="size-5"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            video.muted = !video.muted;
          }}
        />
        {video.muted == false && (
          <Slider
            className="w-20"
            value={[video.volume]}
            min={0}
            max={1}
            step={0.02}
            onValueChange={(value) => (video.volume = value[0])}
          />
        )}
      </div>
      <MdReplay10 className="size-5 cursor-pointer" onClick={onReplay} />
      <div className="cursor-pointer" onClick={onTogglePlay}>
        {isPlaying ? (
          <LuPause className="size-5 fill-white" />
        ) : (
          <LuPlay className="size-5 fill-white" />
        )}
      </div>
      <MdForward10 className="size-5 cursor-pointer" onClick={onSkip} />
      <DropdownMenu
        open={controlsOpen}
        onOpenChange={(open) => {
          setControlsOpen(open);
        }}
      >
        <DropdownMenuTrigger>{`${video.playbackRate}x`}</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup
            onValueChange={(rate) => (video.playbackRate = parseInt(rate))}
          >
            {playbackRates.map((rate) => (
              <DropdownMenuRadioItem key={rate} value={rate.toString()}>
                {rate}x
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
