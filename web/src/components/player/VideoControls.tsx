import { useCallback, useMemo } from "react";
import { isSafari } from "react-device-detect";
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
import { Slider } from "../ui/slider-volume";
import useKeyboardListener from "@/hooks/use-keyboard-listener";

type VideoControls = {
  volume?: boolean;
  seek?: boolean;
  playbackRate?: boolean;
};

const CONTROLS_DEFAULT: VideoControls = {
  volume: true,
  seek: true,
  playbackRate: true,
};
const PLAYBACK_RATE_DEFAULT = isSafari ? [0.5, 1, 2] : [0.5, 1, 2, 4, 8, 16];

type VideoControlsProps = {
  className?: string;
  video?: HTMLVideoElement | null;
  features?: VideoControls;
  isPlaying: boolean;
  show: boolean;
  controlsOpen?: boolean;
  playbackRates?: number[];
  playbackRate: number;
  hotKeys?: boolean;
  setControlsOpen?: (open: boolean) => void;
  onPlayPause: (play: boolean) => void;
  onSeek: (diff: number) => void;
  onSetPlaybackRate: (rate: number) => void;
};
export default function VideoControls({
  className,
  video,
  features = CONTROLS_DEFAULT,
  isPlaying,
  show,
  controlsOpen,
  playbackRates = PLAYBACK_RATE_DEFAULT,
  playbackRate,
  hotKeys = true,
  setControlsOpen,
  onPlayPause,
  onSeek,
  onSetPlaybackRate,
}: VideoControlsProps) {
  const onReplay = useCallback(
    (e: React.MouseEvent<SVGElement>) => {
      e.stopPropagation();
      onSeek(-10);
    },
    [onSeek],
  );

  const onSkip = useCallback(
    (e: React.MouseEvent<SVGElement>) => {
      e.stopPropagation();
      onSeek(10);
    },
    [onSeek],
  );

  const onTogglePlay = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      onPlayPause(!isPlaying);
    },
    [isPlaying, onPlayPause],
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

  const onKeyboardShortcut = useCallback(
    (key: string, down: boolean, repeat: boolean) => {
      switch (key) {
        case "ArrowLeft":
          if (down) {
            onSeek(-10);
          }
          break;
        case "ArrowRight":
          if (down) {
            onSeek(10);
          }
          break;
        case "m":
          if (down && !repeat && video) {
            video.muted = !video.muted;
          }
          break;
        case " ":
          if (down) {
            onPlayPause(!isPlaying);
          }
          break;
      }
    },
    // only update when preview only changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [video, isPlaying, onSeek],
  );
  useKeyboardListener(
    hotKeys ? ["ArrowLeft", "ArrowRight", "m", " "] : [],
    onKeyboardShortcut,
  );

  if (!show) {
    return;
  }

  return (
    <div
      className={`px-4 py-2 flex justify-between items-center gap-8 text-primary z-50 bg-background/60 rounded-lg ${className ?? ""}`}
    >
      {video && features.volume && (
        <div className="flex justify-normal items-center gap-2 cursor-pointer">
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
      )}
      {features.seek && (
        <MdReplay10 className="size-5 cursor-pointer" onClick={onReplay} />
      )}
      <div className="cursor-pointer" onClick={onTogglePlay}>
        {isPlaying ? (
          <LuPause className="size-5 text-primary fill-primary" />
        ) : (
          <LuPlay className="size-5 text-primary fill-primary" />
        )}
      </div>
      {features.seek && (
        <MdForward10 className="size-5 cursor-pointer" onClick={onSkip} />
      )}
      {features.playbackRate && (
        <DropdownMenu
          open={controlsOpen == true}
          onOpenChange={(open) => {
            if (setControlsOpen) {
              setControlsOpen(open);
            }
          }}
        >
          <DropdownMenuTrigger>{`${playbackRate}x`}</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup
              onValueChange={(rate) => onSetPlaybackRate(parseFloat(rate))}
            >
              {playbackRates.map((rate) => (
                <DropdownMenuRadioItem key={rate} value={rate.toString()}>
                  {rate}x
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
