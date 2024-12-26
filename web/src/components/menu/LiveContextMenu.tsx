import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  MdVolumeDown,
  MdVolumeMute,
  MdVolumeOff,
  MdVolumeUp,
} from "react-icons/md";
import { Dialog } from "@/components/ui/dialog";
import { VolumeSlider } from "@/components/ui/slider";
import { CameraStreamingDialog } from "../settings/CameraStreamingDialog";
import {
  AllGroupsStreamingSettings,
  GroupStreamingSettings,
} from "@/types/frigateConfig";
import { useStreamingSettings } from "@/context/streaming-settings-provider";

type LiveContextMenuProps = {
  camera: string;
  streamName: string;
  cameraGroup?: string;
  preferredLiveMode: string;
  isRestreamed: boolean;
  supportsAudio: boolean;
  audioState: boolean;
  toggleAudio: () => void;
  volumeState?: number;
  setVolumeState: (volumeState: number) => void;
  muteAll: () => void;
  unmuteAll: () => void;
  resetPreferredLiveMode: () => void;
  children?: ReactNode;
};
export default function LiveContextMenu({
  camera,
  streamName,
  cameraGroup,
  preferredLiveMode,
  isRestreamed,
  supportsAudio,
  audioState,
  toggleAudio,
  volumeState,
  setVolumeState,
  muteAll,
  unmuteAll,
  resetPreferredLiveMode,
  children,
}: LiveContextMenuProps) {
  const [showSettings, setShowSettings] = useState(false);

  // streaming settings

  const { allGroupsStreamingSettings, setAllGroupsStreamingSettings } =
    useStreamingSettings();

  const [groupStreamingSettings, setGroupStreamingSettings] =
    useState<GroupStreamingSettings>(
      allGroupsStreamingSettings[cameraGroup ?? ""],
    );

  useEffect(() => {
    if (cameraGroup) {
      setGroupStreamingSettings(allGroupsStreamingSettings[cameraGroup]);
    }
    // set individual group when all groups changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allGroupsStreamingSettings]);

  const onSave = useCallback(
    (settings: GroupStreamingSettings) => {
      if (!cameraGroup || !allGroupsStreamingSettings) {
        return;
      }

      const updatedSettings: AllGroupsStreamingSettings = {
        ...Object.fromEntries(
          Object.entries(allGroupsStreamingSettings || {}).filter(
            ([key]) => key !== cameraGroup,
          ),
        ),
        [cameraGroup]: {
          ...Object.fromEntries(
            Object.entries(settings).map(([cameraName, cameraSettings]) => [
              cameraName,
              cameraName === camera
                ? {
                    ...cameraSettings,
                    playAudio: audioState ?? cameraSettings.playAudio ?? false,
                    volume: volumeState ?? cameraSettings.volume ?? 1,
                  }
                : cameraSettings,
            ]),
          ),
          // Add the current camera if it doesn't exist
          ...(!settings[camera]
            ? {
                [camera]: {
                  streamName: streamName,
                  streamType: "smart",
                  compatibilityMode: false,
                  playAudio: audioState,
                  volume: volumeState ?? 1,
                },
              }
            : {}),
        },
      };

      setAllGroupsStreamingSettings?.(updatedSettings);
    },
    [
      camera,
      streamName,
      cameraGroup,
      allGroupsStreamingSettings,
      setAllGroupsStreamingSettings,
      audioState,
      volumeState,
    ],
  );

  // ui

  const audioControlsUsed = useRef(false);

  const VolumeIcon = useMemo(() => {
    if (!volumeState || volumeState == 0.0 || !audioState) {
      return MdVolumeOff;
    } else if (volumeState <= 0.33) {
      return MdVolumeMute;
    } else if (volumeState <= 0.67) {
      return MdVolumeDown;
    } else {
      return MdVolumeUp;
    }
    // only update when specific fields change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volumeState, audioState]);

  const handleVolumeIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    audioControlsUsed.current = true;
    toggleAudio();
  };

  const handleVolumeChange = (value: number[]) => {
    audioControlsUsed.current = true;
    setVolumeState(value[0]);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && audioControlsUsed.current) {
      onSave(groupStreamingSettings);
      audioControlsUsed.current = false;
    }
  };

  return (
    <>
      <ContextMenu key={camera} onOpenChange={handleOpenChange}>
        <ContextMenuTrigger>{children}</ContextMenuTrigger>
        <ContextMenuContent>
          <div className="text-md py-1 pl-2 capitalize text-primary-variant">
            {camera.replaceAll("_", " ")}
          </div>
          {preferredLiveMode != "jsmpeg" && isRestreamed && supportsAudio && (
            <>
              <ContextMenuSeparator className="mb-1" />
              <div className="p-2 text-sm">
                <div className="flex w-full flex-col gap-1">
                  <p>Audio</p>
                  <div className="flex flex-row items-center gap-1">
                    <VolumeIcon
                      className="size-5"
                      onClick={handleVolumeIconClick}
                    />
                    <VolumeSlider
                      disabled={!audioState}
                      className="my-3 ml-0.5 rounded-lg bg-background/60"
                      value={[volumeState ?? 0]}
                      min={0}
                      max={1}
                      step={0.02}
                      onValueChange={handleVolumeChange}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem>
            <div
              className="flex w-full cursor-pointer items-center justify-start gap-2"
              onClick={muteAll}
            >
              <div className="text-primary">Mute All Cameras</div>
            </div>
          </ContextMenuItem>
          <ContextMenuItem>
            <div
              className="flex w-full cursor-pointer items-center justify-start gap-2"
              onClick={unmuteAll}
            >
              <div className="text-primary">Unmute All Cameras</div>
            </div>
          </ContextMenuItem>
          {isRestreamed && cameraGroup && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem>
                <div
                  className="flex w-full cursor-pointer items-center justify-start gap-2"
                  onClick={() => setShowSettings(true)}
                >
                  <div className="text-primary">Streaming Settings</div>
                </div>
              </ContextMenuItem>
            </>
          )}
          {preferredLiveMode == "jsmpeg" && isRestreamed && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem>
                <div
                  className="flex w-full cursor-pointer items-center justify-start gap-2"
                  onClick={resetPreferredLiveMode}
                >
                  <div className="text-primary">Reset</div>
                </div>
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <CameraStreamingDialog
          camera={camera}
          groupStreamingSettings={groupStreamingSettings}
          setGroupStreamingSettings={setGroupStreamingSettings}
          setIsDialogOpen={setShowSettings}
          onSave={onSave}
        />
      </Dialog>
    </>
  );
}
