import BirdseyeLivePlayer from "@/components/player/BirdseyeLivePlayer";
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
import { useParams } from "react-router-dom";
import useSWR from "swr";

function Live() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const { camera: openedCamera } = useParams();

  const [camera, setCamera] = useState<string>(
    openedCamera ?? (config?.birdseye.enabled ? "birdseye" : "Select A Camera")
  );
  const cameraConfig = useMemo(() => {
    return camera == "birdseye" ? undefined : config?.cameras[camera];
  }, [camera, config]);
  const sortedCameras = useMemo(() => {
    if (!config) {
      return [];
    }

    return Object.values(config.cameras).sort(
      (aConf, bConf) => aConf.ui.order - bConf.ui.order
    );
  }, [config]);
  const restreamEnabled = useMemo(() => {
    if (!config) {
      return false;
    }

    if (camera == "birdseye") {
      return config.birdseye.restream;
    }

    return (
      cameraConfig &&
      Object.keys(config.go2rtc.streams || {}).includes(
        cameraConfig.live.stream_name
      )
    );
  }, [config, cameraConfig]);
  const defaultLiveMode = useMemo(() => {
    if (cameraConfig) {
      if (restreamEnabled) {
        return cameraConfig.ui.live_mode || config?.ui.live_mode;
      }

      return "jsmpeg";
    }

    return undefined;
  }, [cameraConfig, restreamEnabled]);
  const [viewSource, setViewSource, sourceIsLoaded] = usePersistence(
    `${camera}-source`,
    camera == "birdseye" ? "jsmpeg" : defaultLiveMode
  );

  return (
    <div className=" w-full">
      <div className="flex justify-between">
        <Heading as="h2">Live</Heading>
        <div className="flex">
          <div className="mx-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="capitalize" variant="outline">
                  {camera?.replaceAll("_", " ") || "Select A Camera"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Select A Camera</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={camera}
                  onValueChange={setCamera}
                >
                  {config?.birdseye.enabled && (
                    <DropdownMenuRadioItem value="birdseye">
                      Birdseye
                    </DropdownMenuRadioItem>
                  )}
                  {sortedCameras.map((item) => (
                    <DropdownMenuRadioItem
                      className="capitalize"
                      key={item.name}
                      value={item.name}
                    >
                      {item.name.replaceAll("_", " ")}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="mx-1">
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
                  {restreamEnabled && (
                    <DropdownMenuRadioItem value="webrtc">
                      Webrtc
                    </DropdownMenuRadioItem>
                  )}
                  {restreamEnabled && (
                    <DropdownMenuRadioItem value="mse">
                      MSE
                    </DropdownMenuRadioItem>
                  )}
                  <DropdownMenuRadioItem value="jsmpeg">
                    Jsmpeg
                  </DropdownMenuRadioItem>
                  {camera != "birdseye" && (
                    <DropdownMenuRadioItem value="debug">
                      Debug
                    </DropdownMenuRadioItem>
                  )}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      {config && camera == "birdseye" && sourceIsLoaded && (
        <BirdseyeLivePlayer
          birdseyeConfig={config?.birdseye}
          liveMode={`${viewSource ?? defaultLiveMode}`}
        />
      )}
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
