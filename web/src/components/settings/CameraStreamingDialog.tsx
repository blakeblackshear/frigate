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
import { Trans, useTranslation } from "react-i18next";

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
  const { t } = useTranslation(["components/camera"]);
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
          {t("group.camera.setting.title", {
            cameraName: camera.replaceAll("_", " "),
          })}
        </DialogTitle>
        <DialogDescription>
          <Trans ns="components/camera">group.camera.setting.desc</Trans>
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col space-y-8">
        {!isRestreamed && (
          <div className="flex flex-col gap-2">
            <Label></Label>
            <div className="flex flex-row items-center gap-1 text-sm text-muted-foreground">
              <LuX className="size-4 text-danger" />
              <div>
                {t("streaming.restreaming.disabled", {
                  ns: "components/dialog",
                })}
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <div className="cursor-pointer p-0">
                    <LuInfo className="size-4" />
                    <span className="sr-only">
                      {t("button.info", { ns: "common" })}
                    </span>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-80 text-xs">
                  {t("streaming.restreaming.desc", { ns: "components/dialog" })}
                  <div className="mt-2 flex items-center text-primary">
                    <Link
                      to="https://docs.frigate.video/configuration/live"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline"
                    >
                      {t("streaming.restreaming.readTheDocumentation", {
                        ns: "components/dialog",
                      })}
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
                      <div>{t("group.camera.setting.audioIsAvailable")}</div>
                    </>
                  ) : (
                    <>
                      <LuX className="size-4 text-danger" />
                      <div>{t("group.camera.setting.audioIsUnavailable")}</div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <div className="cursor-pointer p-0">
                            <LuInfo className="size-4" />
                            <span className="sr-only">
                              {t("button.info", { ns: "common" })}
                            </span>
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 text-xs">
                          {t("group.camera.setting.audio.desc")}
                          <div className="mt-2 flex items-center text-primary">
                            <Link
                              to="https://docs.frigate.video/configuration/live"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline"
                            >
                              {t("group.camera.setting.audio.desc.document")}
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
            {t("group.camera.setting.streamMethod.label")}
          </Label>
          <Select
            value={streamType}
            onValueChange={(value) => setStreamType(value as StreamType)}
          >
            <SelectTrigger className="">
              <SelectValue placeholder="Choose a streaming option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no-streaming">
                {t(
                  "group.camera.setting.streamMethod.method.noStreaming.label",
                )}
              </SelectItem>
              <SelectItem value="smart">
                {t(
                  "group.camera.setting.streamMethod.method.smartStreaming.label",
                )}
              </SelectItem>
              <SelectItem value="continuous">
                {t(
                  "group.camera.setting.streamMethod.method.continuousStreaming.label",
                )}
              </SelectItem>
            </SelectContent>
          </Select>
          {streamType === "no-streaming" && (
            <p className="text-sm text-muted-foreground">
              {t("group.camera.setting.streamMethod.method.noStreaming.desc")}
            </p>
          )}
          {streamType === "smart" && (
            <p className="text-sm text-muted-foreground">
              {t(
                "group.camera.setting.streamMethod.method.smartStreaming.desc",
              )}
            </p>
          )}
          {streamType === "continuous" && (
            <>
              <p className="text-sm text-muted-foreground">
                {t(
                  "group.camera.setting.streamMethod.method.continuousStreaming.desc",
                )}
              </p>
              <div className="flex items-center gap-2">
                <IoIosWarning className="mr-2 size-5 text-danger" />
                <div className="max-w-[85%] text-sm">
                  {t(
                    "group.camera.setting.streamMethod.method.continuousStreaming.desc.warning",
                  )}
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
              {t("group.camera.setting.compatibilityMode.label")}
            </Label>
          </div>
          <div className="flex flex-col gap-2 leading-none">
            <p className="text-sm text-muted-foreground">
              {t("group.camera.setting.compatibilityMode.desc")}
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-end">
        <div className="flex flex-row gap-2 pt-5">
          <Button
            className="flex flex-1"
            aria-label={t("button.cancel", { ns: "common" })}
            onClick={handleCancel}
          >
            {t("button.cancel", { ns: "common" })}
          </Button>
          <Button
            variant="select"
            aria-label={t("button.save", { ns: "common" })}
            disabled={isLoading}
            className="flex flex-1"
            onClick={handleSave}
          >
            {isLoading ? (
              <div className="flex flex-row items-center gap-2">
                <ActivityIndicator />
                <span>{t("button.saving", { ns: "common" })}</span>
              </div>
            ) : (
              t("button.save", { ns: "common" })
            )}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}
