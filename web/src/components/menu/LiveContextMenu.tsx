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
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
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
  FrigateConfig,
  GroupStreamingSettings,
} from "@/types/frigateConfig";
import { useStreamingSettings } from "@/context/streaming-settings-provider";
import {
  IoIosNotifications,
  IoIosNotificationsOff,
  IoIosWarning,
} from "react-icons/io";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import {
  useEnabledState,
  useNotifications,
  useNotificationSuspend,
} from "@/api/ws";

type LiveContextMenuProps = {
  className?: string;
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
  statsState: boolean;
  toggleStats: () => void;
  resetPreferredLiveMode: () => void;
  config?: FrigateConfig;
  children?: ReactNode;
};
export default function LiveContextMenu({
  className,
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
  statsState,
  toggleStats,
  resetPreferredLiveMode,
  config,
  children,
}: LiveContextMenuProps) {
  const [showSettings, setShowSettings] = useState(false);

  // camera enabled

  const { payload: enabledState, send: sendEnabled } = useEnabledState(camera);
  const isEnabled = enabledState === "ON";

  // streaming settings

  const { allGroupsStreamingSettings, setAllGroupsStreamingSettings } =
    useStreamingSettings();

  const [groupStreamingSettings, setGroupStreamingSettings] =
    useState<GroupStreamingSettings>(
      allGroupsStreamingSettings[cameraGroup ?? ""],
    );

  useEffect(() => {
    if (cameraGroup && cameraGroup != "default") {
      setGroupStreamingSettings(allGroupsStreamingSettings[cameraGroup]);
    }
  }, [allGroupsStreamingSettings, cameraGroup]);

  const onSave = useCallback(
    (settings: GroupStreamingSettings) => {
      if (
        !cameraGroup ||
        !allGroupsStreamingSettings ||
        cameraGroup == "default" ||
        !settings
      ) {
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

  // navigate for debug view

  const navigate = useNavigate();

  // notifications

  const notificationsEnabledInConfig =
    config?.cameras[camera].notifications.enabled_in_config;

  const { payload: notificationState, send: sendNotification } =
    useNotifications(camera);
  const { payload: notificationSuspendUntil, send: sendNotificationSuspend } =
    useNotificationSuspend(camera);
  const [isSuspended, setIsSuspended] = useState<boolean>(false);

  useEffect(() => {
    if (notificationSuspendUntil) {
      setIsSuspended(
        notificationSuspendUntil !== "0" || notificationState === "OFF",
      );
    }
  }, [notificationSuspendUntil, notificationState]);

  const handleSuspend = (duration: string) => {
    if (duration === "off") {
      sendNotification("OFF");
    } else {
      sendNotificationSuspend(Number.parseInt(duration));
    }
  };

  const formatSuspendedUntil = (timestamp: string) => {
    if (timestamp === "0") return "Frigate restarts.";

    return formatUnixTimestampToDateTime(Number.parseInt(timestamp), {
      time_style: "medium",
      date_style: "medium",
      timezone: config?.ui.timezone,
      strftime_fmt: `%b %d, ${config?.ui.time_format == "24hour" ? "%H:%M" : "%I:%M %p"}`,
    });
  };

  return (
    <div className={cn("w-full", className)}>
      <ContextMenu key={camera} onOpenChange={handleOpenChange}>
        <ContextMenuTrigger>{children}</ContextMenuTrigger>
        <ContextMenuContent>
          <div className="flex flex-col items-start gap-1 py-1 pl-2">
            <div className="text-md capitalize text-primary-variant">
              {camera.replaceAll("_", " ")}
            </div>
            {preferredLiveMode == "jsmpeg" && isRestreamed && (
              <div className="flex flex-row items-center gap-1">
                <IoIosWarning className="mr-1 size-4 text-danger" />
                <p className="mr-2 text-xs">Low-bandwidth mode</p>
              </div>
            )}
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
                      disabled={!audioState || !isEnabled}
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
              onClick={() => sendEnabled(isEnabled ? "OFF" : "ON")}
            >
              <div className="text-primary">
                {isEnabled ? "Disable" : "Enable"} Camera
              </div>
            </div>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem disabled={!isEnabled}>
            <div
              className="flex w-full cursor-pointer items-center justify-start gap-2"
              onClick={isEnabled ? muteAll : undefined}
            >
              <div className="text-primary">Mute All Cameras</div>
            </div>
          </ContextMenuItem>
          <ContextMenuItem disabled={!isEnabled}>
            <div
              className="flex w-full cursor-pointer items-center justify-start gap-2"
              onClick={isEnabled ? unmuteAll : undefined}
            >
              <div className="text-primary">Unmute All Cameras</div>
            </div>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem disabled={!isEnabled}>
            <div
              className="flex w-full cursor-pointer items-center justify-start gap-2"
              onClick={isEnabled ? toggleStats : undefined}
            >
              <div className="text-primary">
                {statsState ? "Hide" : "Show"} Stream Stats
              </div>
            </div>
          </ContextMenuItem>
          <ContextMenuItem disabled={!isEnabled}>
            <div
              className="flex w-full cursor-pointer items-center justify-start gap-2"
              onClick={
                isEnabled
                  ? () => navigate(`/settings?page=debug&camera=${camera}`)
                  : undefined
              }
            >
              <div className="text-primary">Debug View</div>
            </div>
          </ContextMenuItem>
          {cameraGroup && cameraGroup !== "default" && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem disabled={!isEnabled}>
                <div
                  className="flex w-full cursor-pointer items-center justify-start gap-2"
                  onClick={isEnabled ? () => setShowSettings(true) : undefined}
                >
                  <div className="text-primary">Streaming Settings</div>
                </div>
              </ContextMenuItem>
            </>
          )}
          {preferredLiveMode == "jsmpeg" && isRestreamed && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem disabled={!isEnabled}>
                <div
                  className="flex w-full cursor-pointer items-center justify-start gap-2"
                  onClick={isEnabled ? resetPreferredLiveMode : undefined}
                >
                  <div className="text-primary">Reset</div>
                </div>
              </ContextMenuItem>
            </>
          )}
          {notificationsEnabledInConfig && (
            <>
              <ContextMenuSeparator />
              <ContextMenuSub>
                <ContextMenuSubTrigger disabled={!isEnabled}>
                  <div className="flex items-center gap-2">
                    <span>Notifications</span>
                  </div>
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  <div className="flex flex-col gap-0.5 px-2 py-1.5 text-sm font-medium">
                    <div className="flex w-full items-center gap-1">
                      {notificationState === "ON" ? (
                        <>
                          {isSuspended ? (
                            <>
                              <IoIosNotificationsOff className="size-5 text-muted-foreground" />
                              <span>Suspended</span>
                            </>
                          ) : (
                            <>
                              <IoIosNotifications className="size-5 text-muted-foreground" />
                              <span>Enabled</span>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <IoIosNotificationsOff className="size-5 text-danger" />
                          <span>Disabled</span>
                        </>
                      )}
                    </div>
                    {isSuspended && (
                      <span className="text-xs text-primary-variant">
                        Until {formatSuspendedUntil(notificationSuspendUntil)}
                      </span>
                    )}
                  </div>

                  {isSuspended ? (
                    <>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        disabled={!isEnabled}
                        onClick={
                          isEnabled
                            ? () => {
                                sendNotification("ON");
                                sendNotificationSuspend(0);
                              }
                            : undefined
                        }
                      >
                        <div className="flex w-full flex-col gap-2">
                          {notificationState === "ON" ? (
                            <span>Unsuspend</span>
                          ) : (
                            <span>Enable</span>
                          )}
                        </div>
                      </ContextMenuItem>
                    </>
                  ) : (
                    notificationState === "ON" && (
                      <>
                        <ContextMenuSeparator />
                        <div className="px-2 py-1.5">
                          <p className="mb-2 text-sm font-medium text-muted-foreground">
                            Suspend for:
                          </p>
                          <div className="space-y-1">
                            <ContextMenuItem
                              disabled={!isEnabled}
                              onClick={
                                isEnabled ? () => handleSuspend("5") : undefined
                              }
                            >
                              5 minutes
                            </ContextMenuItem>
                            <ContextMenuItem
                              disabled={!isEnabled}
                              onClick={
                                isEnabled
                                  ? () => handleSuspend("10")
                                  : undefined
                              }
                            >
                              10 minutes
                            </ContextMenuItem>
                            <ContextMenuItem
                              disabled={!isEnabled}
                              onClick={
                                isEnabled
                                  ? () => handleSuspend("30")
                                  : undefined
                              }
                            >
                              30 minutes
                            </ContextMenuItem>
                            <ContextMenuItem
                              disabled={!isEnabled}
                              onClick={
                                isEnabled
                                  ? () => handleSuspend("60")
                                  : undefined
                              }
                            >
                              1 hour
                            </ContextMenuItem>
                            <ContextMenuItem
                              disabled={!isEnabled}
                              onClick={
                                isEnabled
                                  ? () => handleSuspend("840")
                                  : undefined
                              }
                            >
                              12 hours
                            </ContextMenuItem>
                            <ContextMenuItem
                              disabled={!isEnabled}
                              onClick={
                                isEnabled
                                  ? () => handleSuspend("1440")
                                  : undefined
                              }
                            >
                              24 hours
                            </ContextMenuItem>
                            <ContextMenuItem
                              disabled={!isEnabled}
                              onClick={
                                isEnabled
                                  ? () => handleSuspend("off")
                                  : undefined
                              }
                            >
                              Until restart
                            </ContextMenuItem>
                          </div>
                        </div>
                      </>
                    )
                  )}
                </ContextMenuSubContent>
              </ContextMenuSub>
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
    </div>
  );
}
