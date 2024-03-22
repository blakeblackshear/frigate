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

type VideoControlsProps = {
  className?: string;
  video?: HTMLVideoElement | null;
  features?: VideoControls;
  isPlaying: boolean;
  show: boolean;
  controlsOpen?: boolean;
  setControlsOpen?: (open: boolean) => void;
  onPlayPause: (play: boolean) => void;
  onSeek: (diff: number) => void;
};
export default function VideoControls({
  className,
  video,
  features = CONTROLS_DEFAULT,
  isPlaying,
  show,
  controlsOpen,
  setControlsOpen,
  onPlayPause,
  onSeek,
}: VideoControlsProps) {
  const playbackRates = useMemo(() => {
    if (isSafari) {
      return [0.5, 1, 2];
    } else {
      return [0.5, 1, 2, 4, 8, 16];
    }
  }, []);

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

  if (!show) {
    return;
  }

  return (
    <div
      className={`px-4 py-2 flex justify-between items-center gap-8 text-white z-50 bg-secondary-foreground/60 dark:bg-secondary/60 rounded-lg ${className ?? ""}`}
    >
      {video && features.volume && (
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
      )}
      {features.seek && (
        <MdReplay10 className="size-5 cursor-pointer" onClick={onReplay} />
      )}
      <div className="cursor-pointer" onClick={onTogglePlay}>
        {isPlaying ? (
          <LuPause className="size-5 fill-white" />
        ) : (
          <LuPlay className="size-5 fill-white" />
        )}
      </div>
      {features.seek && (
        <MdForward10 className="size-5 cursor-pointer" onClick={onSkip} />
      )}
      {video && features.playbackRate && (
        <DropdownMenu
          open={controlsOpen == true}
          onOpenChange={(open) => {
            if (setControlsOpen) {
              setControlsOpen(open);
            }
          }}
        >
          <DropdownMenuTrigger>{`${video.playbackRate}x`}</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup
              onValueChange={(rate) => (video.playbackRate = parseFloat(rate))}
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
