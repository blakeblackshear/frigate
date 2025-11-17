import { useCallback, useMemo, useRef, useState } from "react";
import { isDesktop, isMobileOnly, isSafari } from "react-device-detect";
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
import useKeyboardListener, {
  KeyModifiers,
} from "@/hooks/use-keyboard-listener";
import { VolumeSlider } from "../ui/slider";
import FrigatePlusIcon from "../icons/FrigatePlusIcon";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { cn } from "@/lib/utils";
import { FaCompress, FaExpand } from "react-icons/fa";
import { useTranslation } from "react-i18next";

type VideoControls = {
  volume?: boolean;
  seek?: boolean;
  playbackRate?: boolean;
  plusUpload?: boolean;
  fullscreen?: boolean;
};

const CONTROLS_DEFAULT: VideoControls = {
  volume: true,
  seek: true,
  playbackRate: true,
  plusUpload: false,
  fullscreen: false,
};
const PLAYBACK_RATE_DEFAULT = isSafari ? [0.5, 1, 2] : [0.5, 1, 2, 4, 8, 16];
const MIN_ITEMS_WRAP = 6;

type VideoControlsProps = {
  className?: string;
  video?: HTMLVideoElement | null;
  features?: VideoControls;
  isPlaying: boolean;
  show: boolean;
  muted?: boolean;
  volume?: number;
  playbackRates?: number[];
  playbackRate: number;
  hotKeys?: boolean;
  fullscreen?: boolean;
  setControlsOpen?: (open: boolean) => void;
  setMuted?: (muted: boolean) => void;
  onPlayPause: (play: boolean) => void;
  onSeek: (diff: number) => void;
  onSetPlaybackRate: (rate: number) => void;
  onUploadFrame?: () => void;
  toggleFullscreen?: () => void;
  containerRef?: React.MutableRefObject<HTMLDivElement | null>;
};
export default function VideoControls({
  className,
  video,
  features = CONTROLS_DEFAULT,
  isPlaying,
  show,
  muted,
  volume,
  playbackRates = PLAYBACK_RATE_DEFAULT,
  playbackRate,
  hotKeys = true,
  fullscreen,
  setControlsOpen,
  setMuted,
  onPlayPause,
  onSeek,
  onSetPlaybackRate,
  onUploadFrame,
  toggleFullscreen,
  containerRef,
}: VideoControlsProps) {
  // layout

  const controlsContainerRef = useRef<HTMLDivElement | null>(null);

  // controls

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
    (key: string | null, modifiers: KeyModifiers) => {
      if (!modifiers.down) {
        return true;
      }

      switch (key) {
        case "ArrowDown":
          onSeek(-1);
          break;
        case "ArrowLeft":
          onSeek(-10);
          break;
        case "ArrowRight":
          onSeek(10);
          break;
        case "ArrowUp":
          onSeek(1);
          break;
        case "f":
          if (toggleFullscreen && !modifiers.repeat) {
            toggleFullscreen();
          }
          break;
        case "m":
          if (setMuted && !modifiers.repeat && video) {
            setMuted(!muted);
          }
          break;
        case " ":
          onPlayPause(!isPlaying);
          break;
      }

      return true;
    },
    // only update when preview only changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [video, isPlaying, fullscreen, toggleFullscreen, onSeek],
  );
  useKeyboardListener(
    hotKeys
      ? ["ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp", "f", "m", " "]
      : [],
    onKeyboardShortcut,
  );

  if (!show) {
    return;
  }

  return (
    <div
      className={cn(
        "z-50 flex w-auto items-center justify-between gap-4 rounded-lg bg-background/60 px-4 py-2 text-primary sm:flex-nowrap sm:gap-8",
        className,
        isMobileOnly &&
          Object.values(features).filter((feat) => feat).length >
            MIN_ITEMS_WRAP &&
          "min-w-[75%] flex-wrap",
      )}
      ref={controlsContainerRef}
    >
      {video && features.volume && (
        <div className="flex cursor-pointer items-center justify-normal gap-2">
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
          <LuPause className="size-5 fill-primary text-primary" />
        ) : (
          <LuPlay className="size-5 fill-primary text-primary" />
        )}
      </div>
      {features.seek && (
        <MdForward10 className="size-5 cursor-pointer" onClick={onSkip} />
      )}
      {features.playbackRate && (
        <DropdownMenu
          modal={!isDesktop}
          onOpenChange={(open) => {
            if (setControlsOpen) {
              setControlsOpen(open);
            }
          }}
        >
          <DropdownMenuTrigger>{`${playbackRate}x`}</DropdownMenuTrigger>
          <DropdownMenuContent
            portalProps={{
              container: containerRef?.current ?? controlsContainerRef.current,
            }}
          >
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
      {features.plusUpload && onUploadFrame && (
        <FrigatePlusUploadButton
          video={video}
          onClose={() => {
            if (setControlsOpen) {
              setControlsOpen(false);
            }
          }}
          onOpen={() => {
            onPlayPause(false);

            if (setControlsOpen) {
              setControlsOpen(true);
            }
          }}
          onUploadFrame={onUploadFrame}
          containerRef={containerRef}
          fullscreen={fullscreen}
        />
      )}
      {features.fullscreen && toggleFullscreen && (
        <div className="cursor-pointer" onClick={toggleFullscreen}>
          {fullscreen ? <FaCompress /> : <FaExpand />}
        </div>
      )}
    </div>
  );
}

type FrigatePlusUploadButtonProps = {
  video?: HTMLVideoElement | null;
  onOpen: () => void;
  onClose: () => void;
  onUploadFrame: () => void;
  containerRef?: React.MutableRefObject<HTMLDivElement | null>;
  fullscreen?: boolean;
};
function FrigatePlusUploadButton({
  video,
  onOpen,
  onClose,
  onUploadFrame,
  containerRef,
  fullscreen,
}: FrigatePlusUploadButtonProps) {
  const { t } = useTranslation(["components/player"]);

  const [videoImg, setVideoImg] = useState<string>();

  return (
    <AlertDialog
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <FrigatePlusIcon
          className="size-5 cursor-pointer"
          onClick={() => {
            onOpen();

            if (video) {
              const videoSize = [video.clientWidth, video.clientHeight];
              const canvas = document.createElement("canvas");
              canvas.width = videoSize[0];
              canvas.height = videoSize[1];

              const context = canvas?.getContext("2d");

              if (context) {
                context.drawImage(video, 0, 0, videoSize[0], videoSize[1]);
                setVideoImg(canvas.toDataURL("image/webp"));
              }
            }
          }}
        />
      </AlertDialogTrigger>
      <AlertDialogContent
        portalProps={
          fullscreen && containerRef?.current
            ? { container: containerRef.current }
            : undefined
        }
        className="md:max-w-2xl lg:max-w-3xl xl:max-w-4xl"
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{t("submitFrigatePlus.title")}</AlertDialogTitle>
        </AlertDialogHeader>
        <img className="aspect-video w-full object-contain" src={videoImg} />
        <AlertDialogFooter>
          <AlertDialogAction className="bg-selected" onClick={onUploadFrame}>
            {t("submitFrigatePlus.submit")}
          </AlertDialogAction>
          <AlertDialogCancel>
            {t("button.cancel", { ns: "common" })}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
