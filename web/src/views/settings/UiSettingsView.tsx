import Heading from "@/components/ui/heading";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCallback, useContext, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Separator } from "../../components/ui/separator";
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

const PLAYBACK_RATE_DEFAULT = isSafari ? [0.5, 1, 2] : [0.5, 1, 2, 4, 8, 16];
const WEEK_STARTS_ON = ["Sunday", "Monday"];

export default function UiSettingsView() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const { t } = useTranslation("views/settings");
  const { auth } = useContext(AuthContext);
  const username = auth?.user?.username;

  const clearStoredLayouts = useCallback(() => {
    if (!config) {
      return [];
    }

    Object.entries(config.camera_groups).forEach(async (value) => {
      await deleteUserNamespacedKey(`${value[0]}-draggable-layout`, username)
        .then(() => {
          toast.success(
            t("general.toast.success.clearStoredLayout", {
              cameraName: value[0],
            }),
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

    await deleteUserNamespacedKey(`streaming-settings`, username)
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

  // settings

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

  return (
    <>
      <div className="flex size-full flex-col md:flex-row">
        <Toaster position="top-center" closeButton={true} />
        <div className="scrollbar-container order-last mb-2 mt-2 flex h-full w-full flex-col overflow-y-auto pb-2 md:order-none">
          <Heading as="h4" className="mb-2">
            {t("general.title")}
          </Heading>

          <Separator className="my-2 flex bg-secondary" />

          <Heading as="h4" className="my-2">
            {t("general.liveDashboard.title")}
          </Heading>

          <div className="mt-2 space-y-6">
            <div className="space-y-3">
              <div className="flex flex-row items-center justify-start gap-2">
                <Switch
                  id="auto-live"
                  checked={autoLive}
                  onCheckedChange={setAutoLive}
                />
                <Label className="cursor-pointer" htmlFor="auto-live">
                  {t("general.liveDashboard.automaticLiveView.label")}
                </Label>
              </div>
              <div className="my-2 max-w-5xl text-sm text-muted-foreground">
                <p>{t("general.liveDashboard.automaticLiveView.desc")}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex flex-row items-center justify-start gap-2">
                <Switch
                  id="images-only"
                  checked={alertVideos}
                  onCheckedChange={setAlertVideos}
                />
                <Label className="cursor-pointer" htmlFor="images-only">
                  {t("general.liveDashboard.playAlertVideos.label")}
                </Label>
              </div>
              <div className="my-2 max-w-5xl text-sm text-muted-foreground">
                <p>{t("general.liveDashboard.playAlertVideos.desc")}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex flex-row items-center justify-start gap-2">
                <Switch
                  id="camera-names"
                  checked={cameraNames}
                  onCheckedChange={setCameraName}
                />
                <Label className="cursor-pointer" htmlFor="camera-names">
                  {t("general.liveDashboard.displayCameraNames.label")}
                </Label>
              </div>
              <div className="my-2 max-w-5xl text-sm text-muted-foreground">
                <p>{t("general.liveDashboard.displayCameraNames.desc")}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex flex-row items-center justify-start gap-2">
                <Label
                  className="cursor-pointer"
                  htmlFor="live-fallback-timeout"
                >
                  {t("general.liveDashboard.liveFallbackTimeout.label")}
                </Label>
              </div>
              <div className="my-2 max-w-5xl text-sm text-muted-foreground">
                <p>{t("general.liveDashboard.liveFallbackTimeout.desc")}</p>
              </div>
              <Select
                value={fallbackTimeout?.toString()}
                onValueChange={(value) => setFallbackTimeout(parseInt(value))}
              >
                <SelectTrigger className="w-36">
                  {t("time.second", {
                    ns: "common",
                    time: fallbackTimeout,
                    count: fallbackTimeout,
                  })}
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((timeout) => (
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
            </div>
          </div>

          <div className="my-3 flex w-full flex-col space-y-6">
            <div className="mt-2 space-y-3">
              <div className="space-y-0.5">
                <div className="text-md">
                  {t("general.storedLayouts.title")}
                </div>
                <div className="my-2 text-sm text-muted-foreground">
                  <p>{t("general.storedLayouts.desc")}</p>
                </div>
              </div>
              <Button
                aria-label={t("general.storedLayouts.clearAll")}
                onClick={clearStoredLayouts}
              >
                {t("general.storedLayouts.clearAll")}
              </Button>
            </div>

            <div className="mt-2 space-y-3">
              <div className="space-y-0.5">
                <div className="text-md">
                  {t("general.cameraGroupStreaming.title")}
                </div>
                <div className="my-2 max-w-5xl text-sm text-muted-foreground">
                  <p>{t("general.cameraGroupStreaming.desc")}</p>
                </div>
              </div>
              <Button
                aria-label={t("general.cameraGroupStreaming.clearAll")}
                onClick={clearStreamingSettings}
              >
                {t("general.cameraGroupStreaming.clearAll")}
              </Button>
            </div>

            <Separator className="my-2 flex bg-secondary" />

            <Heading as="h4" className="my-2">
              {t("general.recordingsViewer.title")}
            </Heading>

            <div className="mt-2 space-y-6">
              <div className="space-y-0.5">
                <div className="text-md">
                  {t("general.recordingsViewer.defaultPlaybackRate.label")}
                </div>
                <div className="my-2 text-sm text-muted-foreground">
                  <p>
                    {t("general.recordingsViewer.defaultPlaybackRate.desc")}
                  </p>
                </div>
              </div>
            </div>
            <Select
              value={playbackRate?.toString()}
              onValueChange={(value) => setPlaybackRate(parseFloat(value))}
            >
              <SelectTrigger className="w-20">
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
            <Separator className="my-2 flex bg-secondary" />

            <Heading as="h4" className="my-2">
              {t("general.calendar.title")}
            </Heading>

            <div className="mt-2 space-y-6">
              <div className="space-y-0.5">
                <div className="text-md">
                  {t("general.calendar.firstWeekday.label")}
                </div>
                <div className="my-2 text-sm text-muted-foreground">
                  <p>{t("general.calendar.firstWeekday.desc")}</p>
                </div>
              </div>
            </div>
            <Select
              value={weekStartsOn?.toString()}
              onValueChange={(value) => setWeekStartsOn(parseInt(value))}
            >
              <SelectTrigger className="w-32">
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
                      {t("general.calendar.firstWeekday." + day.toLowerCase())}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Separator className="my-2 flex bg-secondary" />
          </div>
        </div>
      </div>
    </>
  );
}
