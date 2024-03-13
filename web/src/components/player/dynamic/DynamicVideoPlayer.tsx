import { useCallback, useEffect, useMemo, useState } from "react";
import VideoPlayer from "../VideoPlayer";
import Player from "video.js/dist/types/player";
import TimelineEventOverlay from "../../overlay/TimelineDataOverlay";
import { useApiHost } from "@/api";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import useKeyboardListener from "@/hooks/use-keyboard-listener";
import { Recording } from "@/types/record";
import { Preview } from "@/types/preview";
import PreviewPlayer, { PreviewController } from "../PreviewPlayer";
import { isDesktop } from "react-device-detect";
import { LuPause, LuPlay } from "react-icons/lu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { MdForward10, MdReplay10 } from "react-icons/md";
import { DynamicVideoController } from "./DynamicVideoController";

/**
 * Dynamically switches between video playback and scrubbing preview player.
 */
type DynamicVideoPlayerProps = {
  className?: string;
  camera: string;
  timeRange: { start: number; end: number };
  cameraPreviews: Preview[];
  startTime?: number;
  onControllerReady: (controller: DynamicVideoController) => void;
};
export default function DynamicVideoPlayer({
  className,
  camera,
  timeRange,
  cameraPreviews,
  startTime,
  onControllerReady,
}: DynamicVideoPlayerProps) {
  const apiHost = useApiHost();
  const { data: config } = useSWR<FrigateConfig>("config");

  // playback behavior
  const wideVideo = useMemo(() => {
    if (!config) {
      return false;
    }

    return (
      config.cameras[camera].detect.width /
        config.cameras[camera].detect.height >
      1.7
    );
  }, [camera, config]);

  // controlling playback

  const [playerRef, setPlayerRef] = useState<Player | null>(null);
  const [previewController, setPreviewController] =
    useState<PreviewController | null>(null);
  const [controls, setControls] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [focusedItem, setFocusedItem] = useState<Timeline | undefined>(
    undefined,
  );
  const controller = useMemo(() => {
    if (!config || !playerRef || !previewController) {
      return undefined;
    }

    return new DynamicVideoController(
      camera,
      playerRef,
      previewController,
      (config.cameras[camera]?.detect?.annotation_offset || 0) / 1000,
      "playback",
      setIsScrubbing,
      setFocusedItem,
    );
    // we only want to fire once when players are ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, config, playerRef, previewController]);

  useEffect(() => {
    if (!controller) {
      return;
    }

    if (controller) {
      onControllerReady(controller);
    }

    // we only want to fire once when players are ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller]);

  // keyboard control

  const onKeyboardShortcut = useCallback(
    (key: string, down: boolean, repeat: boolean) => {
      if (!playerRef) {
        return;
      }

      switch (key) {
        case "ArrowLeft":
          if (down) {
            const currentTime = playerRef.currentTime();

            if (currentTime) {
              playerRef.currentTime(Math.max(0, currentTime - 5));
            }
          }
          break;
        case "ArrowRight":
          if (down) {
            const currentTime = playerRef.currentTime();

            if (currentTime) {
              playerRef.currentTime(currentTime + 5);
            }
          }
          break;
        case "m":
          if (down && !repeat && playerRef) {
            playerRef.muted(!playerRef.muted());
          }
          break;
        case " ":
          if (down && playerRef) {
            if (playerRef.paused()) {
              playerRef.play();
            } else {
              playerRef.pause();
            }
          }
          break;
      }
    },
    // only update when preview only changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playerRef],
  );
  useKeyboardListener(
    ["ArrowLeft", "ArrowRight", "m", " "],
    onKeyboardShortcut,
  );

  // mobile tap controls

  useEffect(() => {
    if (isDesktop || !playerRef) {
      return;
    }

    const callback = () => setControls(!controls);
    playerRef.on("touchstart", callback);

    return () => playerRef.off("touchstart", callback);
  }, [controls, playerRef]);

  // initial state

  const initialPlaybackSource = useMemo(() => {
    return {
      src: `${apiHost}vod/${camera}/start/${timeRange.start}/end/${timeRange.end}/master.m3u8`,
      type: "application/vnd.apple.mpegurl",
    };
    // we only want to calculate this once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // start at correct time

  useEffect(() => {
    const player = playerRef;

    if (!player) {
      return;
    }

    if (!startTime) {
      return;
    }

    if (player.isReady_) {
      controller?.seekToTimestamp(startTime, true);
      return;
    }

    const callback = () => {
      controller?.seekToTimestamp(startTime, true);
    };
    player.on("loadeddata", callback);
    return () => {
      player.off("loadeddata", callback);
    };
    // we only want to calculate this once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTime, controller]);

  // state of playback player

  const recordingParams = useMemo(() => {
    return {
      before: timeRange.end,
      after: timeRange.start,
    };
  }, [timeRange]);
  const { data: recordings } = useSWR<Recording[]>(
    [`${camera}/recordings`, recordingParams],
    { revalidateOnFocus: false },
  );

  useEffect(() => {
    if (!controller || !recordings) {
      return;
    }

    const playbackUri = `${apiHost}vod/${camera}/start/${timeRange.start}/end/${timeRange.end}/master.m3u8`;

    controller.newPlayback({
      recordings: recordings ?? [],
      playbackUri,
    });

    // we only want this to change when recordings update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller, recordings]);

  return (
    <div
      className={`relative ${className ?? ""} cursor-pointer`}
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
    >
      <div className={`w-full relative ${isScrubbing ? "hidden" : "visible"}`}>
        <VideoPlayer
          options={{
            preload: "auto",
            autoplay: true,
            sources: [initialPlaybackSource],
            aspectRatio: wideVideo ? undefined : "16:9",
            controls: false,
            nativeControlsForTouch: false,
          }}
          onReady={(player) => {
            setPlayerRef(player);
          }}
          onDispose={() => {
            setPlayerRef(null);
          }}
        >
          {config && focusedItem && (
            <TimelineEventOverlay
              timeline={focusedItem}
              cameraConfig={config.cameras[camera]}
            />
          )}
        </VideoPlayer>
        <PlayerControls
          player={playerRef}
          show={controls}
          controlsOpen={controlsOpen}
          setControlsOpen={setControlsOpen}
        />
      </div>
      <PreviewPlayer
        className={`${isScrubbing ? "visible" : "hidden"} ${className ?? ""}`}
        camera={camera}
        timeRange={timeRange}
        cameraPreviews={cameraPreviews}
        onControllerReady={(previewController) => {
          setPreviewController(previewController);
        }}
      />
    </div>
  );
}

type PlayerControlsProps = {
  player: Player | null;
  show: boolean;
  controlsOpen: boolean;
  setControlsOpen: (open: boolean) => void;
};
function PlayerControls({
  player,
  show,
  controlsOpen,
  setControlsOpen,
}: PlayerControlsProps) {
  const playbackRates = useMemo(() => {
    if (!player) {
      return [];
    }

    // @ts-expect-error player getter requires undefined
    return player.playbackRates(undefined);
  }, [player]);

  const onReplay = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();

      const currentTime = player?.currentTime();

      if (!player || !currentTime) {
        return;
      }

      player.currentTime(Math.max(0, currentTime - 10));
    },
    [player],
  );

  const onSkip = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();

      const currentTime = player?.currentTime();

      if (!player || !currentTime) {
        return;
      }

      player.currentTime(currentTime + 10);
    },
    [player],
  );

  const onTogglePlay = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();

      if (!player) {
        return;
      }

      if (player.paused()) {
        player.play();
      } else {
        player.pause();
      }
    },
    [player],
  );

  if (!player || !show) {
    return;
  }

  return (
    <div
      className={`absolute bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 flex justify-between items-center gap-8 text-white z-10 bg-black bg-opacity-60 rounded-lg`}
    >
      <MdReplay10 className="size-5 cursor-pointer" onClick={onReplay} />
      <div className="cursor-pointer" onClick={onTogglePlay}>
        {player.paused() ? (
          <LuPlay className="size-5 fill-white" />
        ) : (
          <LuPause className="size-5 fill-white" />
        )}
      </div>
      <MdForward10 className="size-5 cursor-pointer" onClick={onSkip} />
      <DropdownMenu
        open={controlsOpen}
        onOpenChange={(open) => {
          setControlsOpen(open);
        }}
      >
        <DropdownMenuTrigger>{`${player.playbackRate()}x`}</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup
            onValueChange={(rate) => player.playbackRate(parseInt(rate))}
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
