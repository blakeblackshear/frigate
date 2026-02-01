import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import AutoUpdatingCameraImage from "@/components/camera/AutoUpdatingCameraImage";
import { CameraConfig, FrigateConfig } from "@/types/frigateConfig";
import { Toaster } from "@/components/ui/sonner";
import { Label } from "@/components/ui/label";
import useSWR from "swr";
import Heading from "@/components/ui/heading";
import { Switch } from "@/components/ui/switch";
import { useUserPersistence } from "@/hooks/use-user-persistence";
import { Skeleton } from "@/components/ui/skeleton";
import { useCameraActivity } from "@/hooks/use-camera-activity";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AudioDetection, ObjectType } from "@/types/ws";
import useDeepMemo from "@/hooks/use-deep-memo";
import { Card } from "@/components/ui/card";
import { getIconForLabel } from "@/utils/iconUtil";
import { capitalizeFirstLetter } from "@/utils/stringUtil";
import { LuExternalLink, LuInfo } from "react-icons/lu";
import { Link } from "react-router-dom";

import DebugDrawingLayer from "@/components/overlay/DebugDrawingLayer";
import { Separator } from "@/components/ui/separator";
import { isDesktop } from "react-device-detect";
import { Trans, useTranslation } from "react-i18next";
import { useDocDomain } from "@/hooks/use-doc-domain";
import { getTranslatedLabel } from "@/utils/i18n";
import { useCameraFriendlyName } from "@/hooks/use-camera-friendly-name";
import { AudioLevelGraph } from "@/components/audio/AudioLevelGraph";
import { useWs } from "@/api/ws";

type ObjectSettingsViewProps = {
  selectedCamera?: string;
};

type Options = { [key: string]: boolean };

const emptyObject = Object.freeze({});

export default function ObjectSettingsView({
  selectedCamera,
}: ObjectSettingsViewProps) {
  const { t } = useTranslation(["views/settings"]);

  const { getLocaleDocUrl } = useDocDomain();

  const { data: config } = useSWR<FrigateConfig>("config");

  const containerRef = useRef<HTMLDivElement>(null);

  const DEBUG_OPTIONS = [
    {
      param: "bbox",
      title: t("debug.boundingBoxes.title"),
      description: t("debug.boundingBoxes.desc"),
      info: (
        <>
          <p className="mb-2">
            <strong>{t("debug.boundingBoxes.colors.label")}</strong>
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <Trans ns="views/settings">debug.boundingBoxes.colors.info</Trans>
          </ul>
        </>
      ),
    },
    {
      param: "timestamp",
      title: t("debug.timestamp.title"),
      description: t("debug.timestamp.desc"),
    },
    {
      param: "zones",
      title: t("debug.zones.title"),
      description: t("debug.zones.desc"),
    },
    {
      param: "mask",
      title: t("debug.mask.title"),
      description: t("debug.mask.desc"),
    },
    {
      param: "motion",
      title: t("debug.motion.title"),
      description: t("debug.motion.desc"),
      info: <Trans ns="views/settings">debug.motion.tips</Trans>,
    },
    {
      param: "regions",
      title: t("debug.regions.title"),
      description: t("debug.regions.desc"),
      info: <Trans ns="views/settings">debug.regions.tips</Trans>,
    },
    {
      param: "paths",
      title: t("debug.paths.title"),
      description: t("debug.paths.desc"),
      info: <Trans ns="views/settings">debug.paths.tips</Trans>,
    },
  ];

  const [options, setOptions, optionsLoaded] = useUserPersistence<Options>(
    `${selectedCamera}-feed`,
    emptyObject,
  );

  const handleSetOption = useCallback(
    (id: string, value: boolean) => {
      const newOptions = { ...options, [id]: value };
      setOptions(newOptions);
    },
    [options, setOptions],
  );

  const [debugDraw, setDebugDraw] = useState(false);

  useEffect(() => {
    setDebugDraw(false);
  }, [selectedCamera]);

  const cameraConfig = useMemo(() => {
    if (config && selectedCamera) {
      return config.cameras[selectedCamera];
    }
  }, [config, selectedCamera]);

  const cameraName = useCameraFriendlyName(cameraConfig);

  const { objects, audio_detections } = useCameraActivity(
    cameraConfig ?? ({} as CameraConfig),
  );

  const memoizedObjects = useDeepMemo(objects);
  const memoizedAudio = useDeepMemo(audio_detections);

  const searchParams = useMemo(() => {
    if (!optionsLoaded) {
      return new URLSearchParams();
    }

    const params = new URLSearchParams(
      Object.keys(options || {}).reduce((memo, key) => {
        //@ts-expect-error we know this is correct
        memo.push([key, options[key] === true ? "1" : "0"]);
        return memo;
      }, []),
    );
    return params;
  }, [options, optionsLoaded]);

  useEffect(() => {
    document.title = t("documentTitle.object");
  }, [t]);

  if (!cameraConfig) {
    return <ActivityIndicator />;
  }

  return (
    <div className="mt-1 flex size-full flex-col pb-2 md:flex-row">
      <Toaster position="top-center" closeButton={true} />
      <div className="scrollbar-container order-last mb-2 mt-2 flex h-full w-full flex-col overflow-y-auto rounded-lg border-[1px] border-secondary-foreground bg-background_alt p-2 md:order-none md:mb-0 md:mr-2 md:mt-0 md:w-3/12">
        <Heading as="h4" className="mb-2">
          {t("debug.title")}
        </Heading>
        <div className="mb-5 space-y-3 text-sm text-muted-foreground">
          <p>
            {t("debug.detectorDesc", {
              detectors: config
                ? Object.keys(config?.detectors)
                    .map((detector) => capitalizeFirstLetter(detector))
                    .join(",")
                : "",
            })}
          </p>
          <p>{t("debug.desc")}</p>
        </div>
        {config?.cameras[cameraConfig.name]?.webui_url && (
          <div className="mb-5 text-sm text-muted-foreground">
            <div className="mt-2 flex flex-row items-center text-primary">
              <Link
                to={config?.cameras[cameraConfig.name]?.webui_url ?? ""}
                target="_blank"
                rel="noopener noreferrer"
                className="inline"
              >
                {t("debug.openCameraWebUI", {
                  camera: cameraName,
                })}
                <LuExternalLink className="ml-2 inline-flex size-3" />
              </Link>
            </div>
          </div>
        )}

        <Tabs defaultValue="debug" className="w-full">
          <TabsList
            className={`grid w-full ${cameraConfig.ffmpeg.inputs.some((input) => input.roles.includes("audio")) ? "grid-cols-3" : "grid-cols-2"}`}
          >
            <TabsTrigger value="debug">{t("debug.debugging")}</TabsTrigger>
            <TabsTrigger value="objectlist">
              {t("debug.objectList")}
            </TabsTrigger>
            {cameraConfig.ffmpeg.inputs.some((input) =>
              input.roles.includes("audio"),
            ) && (
              <TabsTrigger value="audio">{t("debug.audio.title")}</TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="debug">
            <div className="flex w-full flex-col space-y-6">
              <div className="mt-2 space-y-6">
                <div className="my-2.5 flex flex-col gap-2.5">
                  {DEBUG_OPTIONS.map(({ param, title, description, info }) => (
                    <div
                      key={param}
                      className="flex w-full flex-row items-center justify-between"
                    >
                      <div className="mb-2 flex flex-col">
                        <div className="flex items-center gap-2">
                          <Label
                            className="mb-0 cursor-pointer text-primary smart-capitalize"
                            htmlFor={param}
                          >
                            {title}
                          </Label>
                          {info && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <div className="cursor-pointer p-0">
                                  <LuInfo className="size-4" />
                                  <span className="sr-only">Info</span>
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 text-sm">
                                {info}
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {description}
                        </div>
                      </div>
                      <Switch
                        key={`${param}-${selectedCamera}`}
                        className="ml-1"
                        id={param}
                        checked={options && options[param]}
                        disabled={
                          param === "paths" &&
                          cameraConfig?.onvif?.autotracking?.enabled_in_config
                        }
                        onCheckedChange={(isChecked) => {
                          handleSetOption(param, isChecked);
                        }}
                      />
                    </div>
                  ))}
                </div>
                {isDesktop && (
                  <>
                    <Separator className="my-2" />
                    <div className="flex w-full flex-row items-center justify-between">
                      <div className="mb-2 flex flex-col">
                        <div className="flex items-center gap-2">
                          <Label
                            className="mb-0 cursor-pointer text-primary smart-capitalize"
                            htmlFor="debugdraw"
                          >
                            {t("debug.objectShapeFilterDrawing.title")}
                          </Label>

                          <Popover>
                            <PopoverTrigger asChild>
                              <div className="cursor-pointer p-0">
                                <LuInfo className="size-4" />
                                <span className="sr-only">
                                  {t("button.info", { ns: "common" })}
                                </span>
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 text-sm">
                              {t("debug.objectShapeFilterDrawing.tips")}
                              <div className="mt-2 flex items-center text-primary">
                                <Link
                                  to={getLocaleDocUrl(
                                    "configuration/object_filters#object-shape",
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline"
                                >
                                  {t("readTheDocumentation", { ns: "common" })}
                                  <LuExternalLink className="ml-2 inline-flex size-3" />
                                </Link>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {t("debug.objectShapeFilterDrawing.desc")}
                        </div>
                      </div>
                      <Switch
                        key={`$draw-${selectedCamera}`}
                        className="ml-1"
                        id="debug_draw"
                        checked={debugDraw}
                        onCheckedChange={(isChecked) => {
                          setDebugDraw(isChecked);
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="objectlist">
            <ObjectList cameraConfig={cameraConfig} objects={memoizedObjects} />
          </TabsContent>
          {cameraConfig.ffmpeg.inputs.some((input) =>
            input.roles.includes("audio"),
          ) && (
            <TabsContent value="audio">
              <AudioList
                cameraConfig={cameraConfig}
                audioDetections={memoizedAudio}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {cameraConfig ? (
        <div className="flex max-h-[70%] md:h-dvh md:max-h-full md:w-7/12 md:grow">
          <div ref={containerRef} className="relative size-full min-h-10">
            <AutoUpdatingCameraImage
              camera={cameraConfig.name}
              searchParams={searchParams}
              showFps={false}
              className="size-full"
              cameraClasses="relative w-full h-full flex flex-col justify-start"
            />
            {debugDraw && (
              <DebugDrawingLayer
                containerRef={containerRef}
                cameraWidth={cameraConfig.detect.width}
                cameraHeight={cameraConfig.detect.height}
              />
            )}
          </div>
        </div>
      ) : (
        <Skeleton className="size-full rounded-lg md:rounded-2xl" />
      )}
    </div>
  );
}

type ObjectListProps = {
  cameraConfig: CameraConfig;
  objects?: ObjectType[];
};

function ObjectList({ cameraConfig, objects }: ObjectListProps) {
  const { t } = useTranslation(["views/settings"]);
  const { data: config } = useSWR<FrigateConfig>("config");

  const colormap = useMemo(() => {
    if (!config) {
      return;
    }

    return config.model?.colormap;
  }, [config]);

  const getColorForObjectName = useCallback(
    (objectName: string) => {
      return colormap && colormap[objectName]
        ? `rgb(${colormap[objectName][2]}, ${colormap[objectName][1]}, ${colormap[objectName][0]})`
        : "rgb(128, 128, 128)";
    },
    [colormap],
  );

  return (
    <div className="scrollbar-container relative flex w-full flex-col overflow-y-auto">
      {objects && objects.length > 0 ? (
        objects.map((obj: ObjectType) => {
          return (
            <Card className="mb-1 p-2 text-sm" key={obj.id}>
              <div className="flex flex-row items-center gap-3 pb-1">
                <div className="flex flex-1 flex-row items-center justify-start p-3 pl-1">
                  <div
                    className="rounded-lg p-2"
                    style={{
                      backgroundColor: obj.stationary
                        ? "rgb(110,110,110)"
                        : getColorForObjectName(obj.label),
                    }}
                  >
                    {getIconForLabel(obj.label, "object", "size-5 text-white")}
                  </div>
                  <div className="ml-3 text-lg">
                    {getTranslatedLabel(obj.label)}
                  </div>
                </div>
                <div className="flex w-8/12 flex-row items-center justify-end">
                  <div className="text-md mr-2 w-1/3">
                    <div className="flex flex-col items-end justify-end">
                      <p className="mb-1.5 text-sm text-primary-variant">
                        {t("debug.objectShapeFilterDrawing.score")}
                      </p>
                      {obj.score
                        ? (obj.score * 100).toFixed(1).toString()
                        : "-"}
                      %
                    </div>
                  </div>
                  <div className="text-md mr-2 w-1/3">
                    <div className="flex flex-col items-end justify-end">
                      <p className="mb-1.5 text-sm text-primary-variant">
                        {t("debug.objectShapeFilterDrawing.ratio")}
                      </p>
                      {obj.ratio ? obj.ratio.toFixed(2).toString() : "-"}
                    </div>
                  </div>
                  <div className="text-md mr-2 w-1/3">
                    <div className="flex flex-col items-end justify-end">
                      <p className="mb-1.5 text-sm text-primary-variant">
                        {t("debug.objectShapeFilterDrawing.area")}
                      </p>
                      {obj.area ? (
                        <div className="text-end">
                          <div className="text-xs">
                            px: {obj.area.toString()}
                          </div>
                          <div className="text-xs">
                            %:{" "}
                            {(
                              obj.area /
                              (cameraConfig.detect.width *
                                cameraConfig.detect.height)
                            )
                              .toFixed(4)
                              .toString()}
                          </div>
                        </div>
                      ) : (
                        "-"
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })
      ) : (
        <div className="p-3 text-center">{t("debug.noObjects")}</div>
      )}
    </div>
  );
}

type AudioListProps = {
  cameraConfig: CameraConfig;
  audioDetections?: AudioDetection[];
};

function AudioList({ cameraConfig, audioDetections }: AudioListProps) {
  const { t } = useTranslation(["views/settings"]);

  // Get audio levels directly from ws hooks
  const {
    value: { payload: audioRms },
  } = useWs(`${cameraConfig.name}/audio/rms`, "");
  const {
    value: { payload: audioDBFS },
  } = useWs(`${cameraConfig.name}/audio/dBFS`, "");

  return (
    <div className="scrollbar-container flex w-full flex-col overflow-y-auto">
      {audioDetections && Object.keys(audioDetections).length > 0 ? (
        Object.entries(audioDetections).map(([key, obj]) => (
          <Card className="mb-1 p-2 text-sm" key={obj.id ?? key}>
            <div className="flex flex-row items-center gap-3 pb-1">
              <div className="flex flex-1 flex-row items-center justify-start p-3 pl-1">
                <div className="rounded-lg bg-selected p-2">
                  {getIconForLabel(key, "audio", "size-5 text-white")}
                </div>
                <div className="ml-3 text-lg">{getTranslatedLabel(key)}</div>
              </div>
              <div className="flex w-8/12 flex-row items-center justify-end">
                <div className="text-md mr-2 w-1/3">
                  <div className="flex flex-col items-end justify-end">
                    <p className="mb-1.5 text-sm text-primary-variant">
                      {t("debug.audio.score")}
                    </p>
                    {obj.score ? (obj.score * 100).toFixed(1).toString() : "-"}%
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))
      ) : (
        <div className="p-3 text-center">
          <p className="mb-2">{t("debug.audio.noAudioDetections")}</p>
          <p className="text-xs text-muted-foreground">
            {t("debug.audio.currentRMS")}{" "}
            {(typeof audioRms === "number" ? audioRms : 0).toFixed(1)} |{" "}
            {t("debug.audio.currentdbFS")}{" "}
            {(typeof audioDBFS === "number" ? audioDBFS : 0).toFixed(1)}
          </p>
        </div>
      )}

      <AudioLevelGraph cameraName={cameraConfig.name} />
    </div>
  );
}
