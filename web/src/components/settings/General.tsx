import Heading from "@/components/ui/heading";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCallback, useEffect } from "react";
import { Toaster } from "sonner";
import { toast } from "sonner";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";
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
} from "../ui/select";

const PLAYBACK_RATE_DEFAULT = isSafari ? [0.5, 1, 2] : [0.5, 1, 2, 4, 8, 16];

export default function General() {
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

  const [playbackRate, setPlaybackRate] = usePersistence("playbackRate", 1);

  return (
    <>
      <div className="flex flex-col md:flex-row size-full">
        <Toaster position="top-center" closeButton={true} />
        <div className="flex flex-col h-full w-full overflow-y-auto mt-2 md:mt-0 mb-10 md:mb-0 order-last md:order-none md:mr-2 rounded-lg border-secondary-foreground border-[1px] p-2 bg-background_alt">
          <Heading as="h3" className="my-2">
            General Settings
          </Heading>

          <div className="flex flex-col w-full space-y-6">
            <div className="mt-2 space-y-6">
              <div className="space-y-0.5">
                <div className="text-md">Stored Layouts</div>
                <div className="text-sm text-muted-foreground my-2">
                  <p>
                    The layout of cameras in a camera group can be
                    dragged/resized. The positions are stored in your browser's
                    local storage.
                  </p>
                </div>
              </div>
              <div className="flex flex-row justify-start items-center gap-2">
                <Button onClick={clearStoredLayouts}>Clear All Layouts</Button>
              </div>
            </div>
            <Separator className="flex my-2 bg-secondary" />
            <div className="mt-2 space-y-6">
              <div className="space-y-0.5">
                <div className="text-md">Default Playback Rate</div>
                <div className="text-sm text-muted-foreground my-2">
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
            <Separator className="flex my-2 bg-secondary" />
            <div className="mt-2 space-y-6">
              <div className="space-y-0.5">
                <div className="text-md">Low Data Mode</div>
                <div className="text-sm text-muted-foreground my-2">
                  <p>
                    Not yet implemented. <em>Default: disabled</em>
                  </p>
                </div>
              </div>
              <div className="flex flex-row justify-start items-center gap-2">
                <Switch
                  id="lowdata"
                  checked={false}
                  onCheckedChange={() => {}}
                />
                <Label htmlFor="lowdata">
                  Low Data Mode (this device only)
                </Label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
