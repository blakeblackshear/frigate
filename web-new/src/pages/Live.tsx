import LivePlayer from "@/components/player/LivePlayer";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Heading from "@/components/ui/heading";
import { usePersistence } from "@/hooks/use-persistence";
import { FrigateConfig } from "@/types/frigateConfig";
import { useMemo, useState } from "react";
import useSWR from "swr";

function Live() {
  const { data: config } = useSWR<FrigateConfig>("config");

  const [camera, setCamera] = useState<string>("Select A Camera");
  const cameraConfig = useMemo(() => {
    return config?.cameras[camera];
  }, [camera, config]);
  const restreamEnabled = useMemo(() => {
    return (
      config &&
      cameraConfig &&
      Object.keys(config.go2rtc.streams || {}).includes(
        cameraConfig.live.stream_name
      )
    );
  }, [config, cameraConfig]);
  const defaultLiveMode = useMemo(() => {
    if (cameraConfig) {
      if (restreamEnabled) {
        return cameraConfig.ui.live_mode;
      }

      return "jsmpeg";
    }

    return undefined;
  }, [cameraConfig, restreamEnabled]);
  const [viewSource, setViewSource, sourceIsLoaded] = usePersistence(
    `${camera}-source`,
    defaultLiveMode
  );

  return (
    <div className=" w-full">
      <div className="flex justify-between">
        <Heading as="h2">Live</Heading>
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="capitalize" variant="outline">
                {camera?.replaceAll("_", " ") || "Select A Camera"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Select A Camera</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={camera} onValueChange={setCamera}>
                {Object.keys(config?.cameras || {}).map((item) => (
                  <DropdownMenuRadioItem
                    className="capitalize"
                    key={item}
                    value={item}
                  >
                    {item.replaceAll("_", " ")}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="capitalize" variant="outline">
                {viewSource || defaultLiveMode || "Select A Live Mode"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Select A Live Mode</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={`${viewSource}`}
                onValueChange={setViewSource}
              >
                <DropdownMenuRadioItem value="webrtc">
                  Webrtc
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="mse">MSE</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="jsmpeg">
                  Jsmpeg
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="debug">
                  Debug
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {cameraConfig && sourceIsLoaded && (
        <LivePlayer
          liveMode={`${viewSource ?? defaultLiveMode}`}
          cameraConfig={cameraConfig}
        />
      )}
    </div>
  );
}

export default Live;
