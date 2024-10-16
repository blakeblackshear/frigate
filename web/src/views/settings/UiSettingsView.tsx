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
          toast.error(
            `Failed to clear stored layout: ${error.response.data.message}`,
            { position: "top-center" },
          );
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
            General Settings
          </Heading>

          <Separator className="my-2 flex bg-secondary" />

          <Heading as="h4" className="my-2">
            Live Dashboard
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
                  Automatic Live View
                </Label>
              </div>
              <div className="my-2 text-sm text-muted-foreground">
                <p>
                  Automatically switch to a camera's live view when activity is
                  detected. Disabling this option causes static camera images on
                  the Live dashboard to only update once per minute.
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
                  Play Alert Videos
                </Label>
              </div>
              <div className="my-2 text-sm text-muted-foreground">
                <p>
                  By default, recent alerts on the Live dashboard play as small
                  looping videos. Disable this option to only show a static
                  image of recent alerts on this device/browser.
                </p>
              </div>
            </div>
          </div>

          <div className="my-3 flex w-full flex-col space-y-6">
            <div className="mt-2 space-y-6">
              <div className="space-y-0.5">
                <div className="text-md">Stored Layouts</div>
                <div className="my-2 text-sm text-muted-foreground">
                  <p>
                    The layout of cameras in a camera group can be
                    dragged/resized. The positions are stored in your browser's
                    local storage.
                  </p>
                </div>
              </div>
              <Button onClick={clearStoredLayouts}>Clear All Layouts</Button>
            </div>

            <Separator className="my-2 flex bg-secondary" />

            <Heading as="h4" className="my-2">
              Recordings Viewer
            </Heading>

            <div className="mt-2 space-y-6">
              <div className="space-y-0.5">
                <div className="text-md">Default Playback Rate</div>
                <div className="my-2 text-sm text-muted-foreground">
                  <p>Default playback rate for recordings playback.</p>
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
              Calendar
            </Heading>

            <div className="mt-2 space-y-6">
              <div className="space-y-0.5">
                <div className="text-md">First Weekday</div>
                <div className="my-2 text-sm text-muted-foreground">
                  <p>The day that the weeks of the review calendar begin on.</p>
                </div>
              </div>
            </div>
            <Select
              value={weekStartsOn?.toString()}
              onValueChange={(value) => setWeekStartsOn(parseInt(value))}
            >
              <SelectTrigger className="w-32">
                {WEEK_STARTS_ON[weekStartsOn ?? 0]}
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {WEEK_STARTS_ON.map((day, index) => (
                    <SelectItem
                      key={index}
                      className="cursor-pointer"
                      value={index.toString()}
                    >
                      {day}
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
