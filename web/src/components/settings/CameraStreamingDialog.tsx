import { useState, useCallback, useEffect, useMemo } from "react";
import { IoIosWarning } from "react-icons/io";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  FrigateConfig,
  GroupStreamingSettings,
  StreamType,
} from "@/types/frigateConfig";
import ActivityIndicator from "../indicators/activity-indicator";
import useSWR from "swr";
import { LuCheck, LuExternalLink, LuInfo, LuX } from "react-icons/lu";
import { Link } from "react-router-dom";
import { LiveStreamMetadata } from "@/types/live";

type CameraStreamingDialogProps = {
  camera: string;
  groupStreamingSettings: GroupStreamingSettings;
  setGroupStreamingSettings: React.Dispatch<
    React.SetStateAction<GroupStreamingSettings>
  >;
  setIsDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onSave?: (settings: GroupStreamingSettings) => void;
};

export function CameraStreamingDialog({
  camera,
  groupStreamingSettings,
  setGroupStreamingSettings,
  setIsDialogOpen,
  onSave,
}: CameraStreamingDialogProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  const [isLoading, setIsLoading] = useState(false);

  const [streamName, setStreamName] = useState(
    Object.entries(config?.cameras[camera]?.live?.streams || {})[0]?.[1] || "",
  );
  const [streamType, setStreamType] = useState<StreamType>("smart");
  const [compatibilityMode, setCompatibilityMode] = useState(false);

  // metadata

  const isRestreamed = useMemo(
    () =>
      config &&
      Object.keys(config.go2rtc.streams || {}).includes(streamName ?? ""),
    [config, streamName],
  );

  const { data: cameraMetadata } = useSWR<LiveStreamMetadata>(
    isRestreamed ? `go2rtc/streams/${streamName}` : null,
    {
      revalidateOnFocus: false,
    },
  );

  const supportsAudioOutput = useMemo(() => {
    if (!cameraMetadata) {
      return false;
    }

    return (
      cameraMetadata.producers.find(
        (prod) =>
          prod.medias &&
          prod.medias.find((media) => media.includes("audio, recvonly")) !=
            undefined,
      ) != undefined
    );
  }, [cameraMetadata]);

  // handlers

  useEffect(() => {
    if (!config) {
      return;
    }
    if (groupStreamingSettings && groupStreamingSettings[camera]) {
      const cameraSettings = groupStreamingSettings[camera];
      setStreamName(cameraSettings.streamName || "");
      setStreamType(cameraSettings.streamType || "smart");
      setCompatibilityMode(cameraSettings.compatibilityMode || false);
    } else {
      setStreamName(
        Object.entries(config?.cameras[camera]?.live?.streams || {})[0]?.[1] ||
          "",
      );
      setStreamType("smart");
      setCompatibilityMode(false);
    }
  }, [groupStreamingSettings, camera, config]);

  const handleSave = useCallback(() => {
    setIsLoading(true);
    const updatedSettings = {
      ...groupStreamingSettings,
      [camera]: {
        streamName,
        streamType,
        compatibilityMode,
        playAudio: groupStreamingSettings?.[camera]?.playAudio ?? false,
        volume: groupStreamingSettings?.[camera]?.volume ?? 1,
      },
    };

    setGroupStreamingSettings(updatedSettings);
    setIsDialogOpen(false);
    setIsLoading(false);
    onSave?.(updatedSettings);
  }, [
    groupStreamingSettings,
    setGroupStreamingSettings,
    camera,
    streamName,
    streamType,
    compatibilityMode,
    setIsDialogOpen,
    onSave,
  ]);

  const handleCancel = useCallback(() => {
    if (!config) {
      return;
    }
    if (groupStreamingSettings && groupStreamingSettings[camera]) {
      const cameraSettings = groupStreamingSettings[camera];
      setStreamName(cameraSettings.streamName || "");
      setStreamType(cameraSettings.streamType || "smart");
      setCompatibilityMode(cameraSettings.compatibilityMode || false);
    } else {
      setStreamName(
        Object.entries(config?.cameras[camera]?.live?.streams || {})[0]?.[1] ||
          "",
      );
      setStreamType("smart");
      setCompatibilityMode(false);
    }
    setIsDialogOpen(false);
  }, [groupStreamingSettings, camera, config, setIsDialogOpen]);

  if (!config) {
    return null;
  }

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader className="mb-4">
        <DialogTitle className="capitalize">
          {camera.replaceAll("_", " ")} Streaming Settings
        </DialogTitle>
        <DialogDescription>
          Change the live streaming options for this camera group's dashboard.{" "}
          <em>These settings are device/browser-specific.</em>
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col space-y-8">
        {!isRestreamed && (
          <div className="flex flex-col gap-2">
            <Label>Stream</Label>
            <div className="flex flex-row items-center gap-1 text-sm text-muted-foreground">
              <LuX className="size-4 text-danger" />
              <div>Restreaming is not enabled for this camera.</div>
              <Popover>
                <PopoverTrigger asChild>
                  <div className="cursor-pointer p-0">
                    <LuInfo className="size-4" />
                    <span className="sr-only">Info</span>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-80 text-xs">
                  Set up go2rtc for additional live view options and audio for
                  this camera.
                  <div className="mt-2 flex items-center text-primary">
                    <Link
                      to="https://docs.frigate.video/configuration/live"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline"
                    >
                      Read the documentation{" "}
                      <LuExternalLink className="ml-2 inline-flex size-3" />
                    </Link>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}
        {isRestreamed &&
          Object.entries(config?.cameras[camera].live.streams).length > 0 && (
            <div className="flex flex-col items-start gap-2">
              <Label htmlFor="stream" className="text-right">
                Stream
              </Label>
              <Select value={streamName} onValueChange={setStreamName}>
                <SelectTrigger className="">
                  <SelectValue placeholder="Choose a stream" />
                </SelectTrigger>
                <SelectContent>
                  {camera !== "birdseye" &&
                    Object.entries(config?.cameras[camera].live.streams).map(
                      ([name, stream]) => (
                        <SelectItem key={stream} value={stream}>
                          {name}
                        </SelectItem>
                      ),
                    )}
                </SelectContent>
                <div className="flex flex-row items-center gap-1 text-sm text-muted-foreground">
                  {supportsAudioOutput ? (
                    <>
                      <LuCheck className="size-4 text-success" />
                      <div>Audio is available for this stream</div>
                    </>
                  ) : (
                    <>
                      <LuX className="size-4 text-danger" />
                      <div>Audio is unavailable for this stream</div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <div className="cursor-pointer p-0">
                            <LuInfo className="size-4" />
                            <span className="sr-only">Info</span>
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 text-xs">
                          Audio must be output from your camera and configured
                          in go2rtc for this stream.
                          <div className="mt-2 flex items-center text-primary">
                            <Link
                              to="https://docs.frigate.video/configuration/live"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline"
                            >
                              Read the documentation{" "}
                              <LuExternalLink className="ml-2 inline-flex size-3" />
                            </Link>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </>
                  )}
                </div>
              </Select>
            </div>
          )}
        <div className="flex flex-col items-start gap-2">
          <Label htmlFor="streaming-method" className="text-right">
            Streaming Method
          </Label>
          <Select
            value={streamType}
            onValueChange={(value) => setStreamType(value as StreamType)}
          >
            <SelectTrigger className="">
              <SelectValue placeholder="Choose a streaming option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no-streaming">No Streaming</SelectItem>
              <SelectItem value="smart">
                Smart Streaming (recommended)
              </SelectItem>
              <SelectItem value="continuous">Continuous Streaming</SelectItem>
            </SelectContent>
          </Select>
          {streamType === "no-streaming" && (
            <p className="text-sm text-muted-foreground">
              Camera images will only update once per minute and no live
              streaming will occur.
            </p>
          )}
          {streamType === "smart" && (
            <p className="text-sm text-muted-foreground">
              Smart streaming will update your camera image once per minute when
              no detectable activity is occurring to conserve bandwidth and
              resources. When activity is detected, the image seamlessly
              switches to a live stream.
            </p>
          )}
          {streamType === "continuous" && (
            <>
              <p className="text-sm text-muted-foreground">
                Camera image will always be a live stream when visible on the
                dashboard, even if no activity is being detected.
              </p>
              <div className="flex items-center gap-2">
                <IoIosWarning className="mr-2 size-5 text-danger" />
                <div className="max-w-[85%] text-sm">
                  Continuous streaming may cause high bandwidth usage and
                  performance issues. Use with caution.
                </div>
              </div>
            </>
          )}
        </div>
        <div className="flex flex-col items-start gap-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="compatibility"
              className="size-5 text-white accent-white data-[state=checked]:bg-selected data-[state=checked]:text-white"
              checked={compatibilityMode}
              onCheckedChange={() => setCompatibilityMode(!compatibilityMode)}
            />
            <Label
              htmlFor="compatibility"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Compatibility mode
            </Label>
          </div>
          <div className="flex flex-col gap-2 leading-none">
            <p className="text-sm text-muted-foreground">
              Enable this option only if your camera's live stream is displaying
              color artifacts and has a diagonal line on the right side of the
              image.
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-end">
        <div className="flex flex-row gap-2 pt-5">
          <Button
            className="flex flex-1"
            aria-label="Cancel"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            variant="select"
            aria-label="Save"
            disabled={isLoading}
            className="flex flex-1"
            onClick={handleSave}
          >
            {isLoading ? (
              <div className="flex flex-row items-center gap-2">
                <ActivityIndicator />
                <span>Saving...</span>
              </div>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}
