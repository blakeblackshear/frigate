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
import useKeyboardListener from "@/hooks/use-keyboard-listener";
import { VolumeSlider } from "../ui/slider";

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
  muted?: boolean;
  volume?: number;
  controlsOpen?: boolean;
  playbackRates?: number[];
  playbackRate: number;
  hotKeys?: boolean;
  setControlsOpen?: (open: boolean) => void;
  setMuted?: (muted: boolean) => void;
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
  muted,
  volume,
  controlsOpen,
  playbackRates = PLAYBACK_RATE_DEFAULT,
  playbackRate,
  hotKeys = true,
  setControlsOpen,
  setMuted,
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
    if (!volume || volume == 0.0 || muted) {
      return MdVolumeOff;
    } else if (volume <= 0.33) {
      return MdVolumeMute;
    } else if (volume <= 0.67) {
      return MdVolumeDown;
    } else {
      return MdVolumeUp;
    }
    // only update when specific fields change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume, muted]);

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
          if (setMuted && down && !repeat && video) {
            setMuted(!muted);
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

              if (setMuted) {
                setMuted(!muted);
              }
            }}
          />
          {muted == false && (
            <VolumeSlider
              className="w-20"
              value={[volume ?? 1.0]}
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
                <DropdownMenuRadioItem
                  key={rate}
                  className="cursor-pointer"
                  value={rate.toString()}
                >
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
