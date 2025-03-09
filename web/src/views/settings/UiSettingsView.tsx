import Heading from "@/components/ui/heading";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCallback, useEffect } from "react";
import { Toaster } from "sonner";
import { toast } from "sonner";
import { Separator } from "../../components/ui/separator";
import { Button } from "../../components/ui/button";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { del as delData } from "idb-keyval";
import { usePersistence } from "@/hooks/use-persistence";
import { isSafari } from "react-device-detect";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "../../components/ui/select";
import { Trans } from "react-i18next";
import { t } from "i18next";

const PLAYBACK_RATE_DEFAULT = isSafari ? [0.5, 1, 2] : [0.5, 1, 2, 4, 8, 16];
const WEEK_STARTS_ON = ["Sunday", "Monday"];

export default function UiSettingsView() {
  const { data: config } = useSWR<FrigateConfig>("config");

  const clearStoredLayouts = useCallback(() => {
    if (!config) {
      return [];
    }

    Object.entries(config.camera_groups).forEach(async (value) => {
      await delData(`${value[0]}-draggable-layout`)
        .then(() => {
          toast.success(`Cleared stored layout for ${value[0]}`, {
            position: "top-center",
          });
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            "Unknown error";
          toast.error(`Failed to clear stored layout: ${errorMessage}`, {
            position: "top-center",
          });
        });
    });
  }, [config]);

  const clearStreamingSettings = useCallback(async () => {
    if (!config) {
      return [];
    }

    await delData(`streaming-settings`)
      .then(() => {
        toast.success(`Cleared streaming settings for all camera groups.`, {
          position: "top-center",
        });
      })
      .catch((error) => {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unknown error";
        toast.error(`Failed to clear streaming settings: ${errorMessage}`, {
          position: "top-center",
        });
      });
  }, [config]);

  useEffect(() => {
    document.title = "General Settings - Frigate";
  }, []);

  // settings

  const [autoLive, setAutoLive] = usePersistence("autoLiveView", true);
  const [playbackRate, setPlaybackRate] = usePersistence("playbackRate", 1);
  const [weekStartsOn, setWeekStartsOn] = usePersistence("weekStartsOn", 0);
  const [alertVideos, setAlertVideos] = usePersistence("alertVideos", true);

  return (
    <>
      <div className="flex size-full flex-col md:flex-row">
        <Toaster position="top-center" closeButton={true} />
        <div className="scrollbar-container order-last mb-10 mt-2 flex h-full w-full flex-col overflow-y-auto rounded-lg border-[1px] border-secondary-foreground bg-background_alt p-2 md:order-none md:mb-0 md:mr-2 md:mt-0">
          <Heading as="h3" className="my-2">
            <Trans ns="views/settings">general.title</Trans>
          </Heading>

          <Separator className="my-2 flex bg-secondary" />

          <Heading as="h4" className="my-2">
            <Trans ns="views/settings">general.liveDashboard.title</Trans>
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
                  <Trans ns="views/settings">
                    general.liveDashboard.automaticLiveView.label
                  </Trans>
                </Label>
              </div>
              <div className="my-2 max-w-5xl text-sm text-muted-foreground">
                <p>
                  <Trans ns="views/settings">
                    general.liveDashboard.automaticLiveView.desc
                  </Trans>
                </p>
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
                  <Trans ns="views/settings">general.liveDashboard.playAlertVideos.label</Trans>
                </Label>
              </div>
              <div className="my-2 max-w-5xl text-sm text-muted-foreground">
                <p>
                  <Trans ns="views/settings">
                    general.liveDashboard.playAlertVideos.desc
                  </Trans>
                </p>
              </div>
            </div>
          </div>

          <div className="my-3 flex w-full flex-col space-y-6">
            <div className="mt-2 space-y-3">
              <div className="space-y-0.5">
                <div className="text-md">
                  <Trans ns="views/settings">general.storedLayouts.title</Trans>
                </div>
                <div className="my-2 text-sm text-muted-foreground">
                  <p>
                    <Trans ns="views/settings">
                      general.storedLayouts.desc
                    </Trans>
                  </p>
                </div>
              </div>
              <Button
                aria-label="Clear all saved layouts"
                onClick={clearStoredLayouts}
              >
                <Trans ns="views/settings">
                  general.storedLayouts.clearAll
                </Trans>
              </Button>
            </div>

            <div className="mt-2 space-y-3">
              <div className="space-y-0.5">
                <div className="text-md">
                  <Trans ns="views/settings">
                    general.cameraGroupStreaming.title
                  </Trans>
                </div>
                <div className="my-2 max-w-5xl text-sm text-muted-foreground">
                  <p>
                    <Trans ns="views/settings">
                      general.cameraGroupStreaming.desc
                    </Trans>
                  </p>
                </div>
              </div>
              <Button
                aria-label="Clear all group streaming settings"
                onClick={clearStreamingSettings}
              >
                <Trans ns="views/settings">
                  general.cameraGroupStreaming.clearAll
                </Trans>
              </Button>
            </div>

            <Separator className="my-2 flex bg-secondary" />

            <Heading as="h4" className="my-2">
              <Trans ns="views/settings">general.recordingsViewer.title</Trans>
            </Heading>

            <div className="mt-2 space-y-6">
              <div className="space-y-0.5">
                <div className="text-md">
                  <Trans ns="views/settings">
                    general.recordingsViewer.defaultPlaybackRate.label
                  </Trans>
                </div>
                <div className="my-2 text-sm text-muted-foreground">
                  <p>
                    <Trans ns="views/settings">
                      general.recordingsViewer.defaultPlaybackRate.desc
                    </Trans>
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
              <Trans ns="views/settings">general.calendar.title</Trans>
            </Heading>

            <div className="mt-2 space-y-6">
              <div className="space-y-0.5">
                <div className="text-md">
                  <Trans ns="views/settings">
                    general.calendar.firstWeekday.label
                  </Trans>
                </div>
                <div className="my-2 text-sm text-muted-foreground">
                  <p>
                    <Trans ns="views/settings">
                      general.calendar.firstWeekday.desc
                    </Trans>
                  </p>
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
                    {ns: "views/settings"}
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
                          {ns: "views/settings"}
                      )}
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
