import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ReactNode, useCallback, useContext, useEffect } from "react";
import { Toaster, toast } from "sonner";
import { Button } from "../../components/ui/button";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import {
  useUserPersistence,
  deleteUserNamespacedKey,
} from "@/hooks/use-user-persistence";
import { isSafari } from "react-device-detect";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "../../components/ui/select";
import { useTranslation } from "react-i18next";
import { AuthContext } from "@/context/auth-context";
import {
  SettingsGroupCard,
  SPLIT_ROW_CLASS_NAME,
  DESCRIPTION_CLASS_NAME,
  CONTROL_COLUMN_CLASS_NAME,
} from "@/components/card/SettingsGroupCard";
import Heading from "@/components/ui/heading";

const WEEK_STARTS_ON = ["Sunday", "Monday"];

type SwitchSettingRowProps = {
  id: string;
  label: string;
  description: string;
  checked: boolean | undefined;
  onCheckedChange: (checked: boolean | undefined) => void;
};

function SwitchSettingRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: SwitchSettingRowProps) {
  return (
    <div className={SPLIT_ROW_CLASS_NAME}>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4 md:block">
          <Label className="cursor-pointer" htmlFor={id}>
            {label}
          </Label>
          <div className="md:hidden">
            <Switch
              id={id}
              checked={checked ?? false}
              onCheckedChange={onCheckedChange}
            />
          </div>
        </div>
        <p className={DESCRIPTION_CLASS_NAME}>{description}</p>
      </div>
      <div className="hidden w-full md:flex md:max-w-2xl md:items-center">
        <Switch
          id={`${id}-desktop`}
          checked={checked ?? false}
          onCheckedChange={onCheckedChange}
        />
      </div>
    </div>
  );
}

type ValueSettingRowProps = {
  id: string;
  label: string;
  description: string;
  control: ReactNode;
};

function ValueSettingRow({
  id,
  label,
  description,
  control,
}: ValueSettingRowProps) {
  return (
    <div className={SPLIT_ROW_CLASS_NAME}>
      <div className="space-y-1.5">
        <Label className="cursor-pointer" htmlFor={id}>
          {label}
        </Label>
        <p className="hidden text-sm text-muted-foreground md:block">
          {description}
        </p>
      </div>
      <div className={`${CONTROL_COLUMN_CLASS_NAME} space-y-1.5`}>
        {control}
        <p className="text-sm text-muted-foreground md:hidden">{description}</p>
      </div>
    </div>
  );
}

export default function UiSettingsView() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const { t } = useTranslation("views/settings");
  const { auth } = useContext(AuthContext);
  const username = auth?.user?.username;

  const PLAYBACK_RATE_DEFAULT = isSafari ? [0.5, 1, 2] : [0.5, 1, 2, 4, 8, 16];

  const clearStoredLayouts = useCallback(() => {
    if (!config) {
      return [];
    }

    Object.entries(config.camera_groups).forEach(async ([cameraName]) => {
      await deleteUserNamespacedKey(`${cameraName}-draggable-layout`, username)
        .then(() => {
          toast.success(
            t("general.toast.success.clearStoredLayout", { cameraName }),
            {
              position: "top-center",
            },
          );
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            "Unknown error";
          toast.error(
            t("general.toast.error.clearStoredLayoutFailed", { errorMessage }),
            {
              position: "top-center",
            },
          );
        });
    });
  }, [config, t, username]);

  const clearStreamingSettings = useCallback(async () => {
    if (!config) {
      return [];
    }

    await deleteUserNamespacedKey("streaming-settings", username)
      .then(() => {
        toast.success(t("general.toast.success.clearStreamingSettings"), {
          position: "top-center",
        });
      })
      .catch((error) => {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unknown error";
        toast.error(
          t("general.toast.error.clearStreamingSettingsFailed", {
            errorMessage,
          }),
          {
            position: "top-center",
          },
        );
      });
  }, [config, t, username]);

  useEffect(() => {
    document.title = t("documentTitle.general");
  }, [t]);

  const [autoLive, setAutoLive] = useUserPersistence("autoLiveView", true);
  const [cameraNames, setCameraName] = useUserPersistence(
    "displayCameraNames",
    false,
  );
  const [playbackRate, setPlaybackRate] = useUserPersistence("playbackRate", 1);
  const [weekStartsOn, setWeekStartsOn] = useUserPersistence("weekStartsOn", 0);
  const [alertVideos, setAlertVideos] = useUserPersistence("alertVideos", true);
  const [fallbackTimeout, setFallbackTimeout] = useUserPersistence(
    "liveFallbackTimeout",
    3,
  );

  const liveDashboardSwitchRows = [
    {
      id: "auto-live",
      label: t("general.liveDashboard.automaticLiveView.label"),
      description: t("general.liveDashboard.automaticLiveView.desc"),
      checked: autoLive,
      onCheckedChange: setAutoLive,
    },
    {
      id: "images-only",
      label: t("general.liveDashboard.playAlertVideos.label"),
      description: t("general.liveDashboard.playAlertVideos.desc"),
      checked: alertVideos,
      onCheckedChange: setAlertVideos,
    },
    {
      id: "camera-names",
      label: t("general.liveDashboard.displayCameraNames.label"),
      description: t("general.liveDashboard.displayCameraNames.desc"),
      checked: cameraNames,
      onCheckedChange: setCameraName,
    },
  ];

  return (
    <div className="flex size-full flex-col md:pb-8">
      <Toaster position="top-center" closeButton={true} />
      <Heading as="h4" className="mb-3">
        {t("general.title")}
      </Heading>
      <div className="scrollbar-container mb-2 mt-2 flex h-full w-full flex-col overflow-y-auto pb-2">
        <div className="w-full max-w-5xl space-y-6">
          <SettingsGroupCard title={t("general.liveDashboard.title")}>
            <div className="space-y-6">
              {liveDashboardSwitchRows.map((row) => (
                <SwitchSettingRow key={row.id} {...row} />
              ))}

              <ValueSettingRow
                id="live-fallback-timeout"
                label={t("general.liveDashboard.liveFallbackTimeout.label")}
                description={t(
                  "general.liveDashboard.liveFallbackTimeout.desc",
                )}
                control={
                  <Select
                    value={fallbackTimeout?.toString()}
                    onValueChange={(value) =>
                      setFallbackTimeout(parseInt(value, 10))
                    }
                  >
                    <SelectTrigger
                      id="live-fallback-timeout"
                      className="w-full md:w-36"
                    >
                      {t("time.second", {
                        ns: "common",
                        time: fallbackTimeout,
                        count: fallbackTimeout,
                      })}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {[1, 2, 3, 5, 8, 10, 12, 15].map((timeout) => (
                          <SelectItem
                            key={timeout}
                            className="cursor-pointer"
                            value={timeout.toString()}
                          >
                            {t("time.second", {
                              ns: "common",
                              time: timeout,
                              count: timeout,
                            })}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                }
              />

              <ValueSettingRow
                id="stored-layouts-clear"
                label={t("general.storedLayouts.title")}
                description={t("general.storedLayouts.desc")}
                control={
                  <Button
                    id="stored-layouts-clear"
                    aria-label={t("general.storedLayouts.clearAll")}
                    className="w-full md:w-auto"
                    onClick={clearStoredLayouts}
                  >
                    {t("general.storedLayouts.clearAll")}
                  </Button>
                }
              />

              <ValueSettingRow
                id="camera-group-streaming-clear"
                label={t("general.cameraGroupStreaming.title")}
                description={t("general.cameraGroupStreaming.desc")}
                control={
                  <Button
                    id="camera-group-streaming-clear"
                    aria-label={t("general.cameraGroupStreaming.clearAll")}
                    className="w-full md:w-auto"
                    onClick={clearStreamingSettings}
                  >
                    {t("general.cameraGroupStreaming.clearAll")}
                  </Button>
                }
              />
            </div>
          </SettingsGroupCard>

          <SettingsGroupCard title={t("general.recordingsViewer.title")}>
            <ValueSettingRow
              id="default-playback-rate"
              label={t("general.recordingsViewer.defaultPlaybackRate.label")}
              description={t(
                "general.recordingsViewer.defaultPlaybackRate.desc",
              )}
              control={
                <Select
                  value={playbackRate?.toString()}
                  onValueChange={(value) => setPlaybackRate(parseFloat(value))}
                >
                  <SelectTrigger
                    id="default-playback-rate"
                    className="w-full md:w-20"
                  >
                    {`${playbackRate}x`}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {PLAYBACK_RATE_DEFAULT.map((rate) => (
                        <SelectItem
                          key={rate}
                          className="cursor-pointer"
                          value={rate.toString()}
                        >
                          {rate}x
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              }
            />
          </SettingsGroupCard>

          <SettingsGroupCard title={t("general.calendar.title")}>
            <ValueSettingRow
              id="first-weekday"
              label={t("general.calendar.firstWeekday.label")}
              description={t("general.calendar.firstWeekday.desc")}
              control={
                <Select
                  value={weekStartsOn?.toString()}
                  onValueChange={(value) =>
                    setWeekStartsOn(parseInt(value, 10))
                  }
                >
                  <SelectTrigger id="first-weekday" className="w-full md:w-32">
                    {t(
                      "general.calendar.firstWeekday." +
                        WEEK_STARTS_ON[weekStartsOn ?? 0].toLowerCase(),
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {WEEK_STARTS_ON.map((day, index) => (
                        <SelectItem
                          key={index}
                          className="cursor-pointer"
                          value={index.toString()}
                        >
                          {t(
                            "general.calendar.firstWeekday." +
                              day.toLowerCase(),
                          )}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              }
            />
          </SettingsGroupCard>
        </div>
      </div>
    </div>
  );
}
