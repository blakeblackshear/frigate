import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import useSWR from "swr";
import axios from "axios";
import { toast } from "sonner";
import AutoUpdatingCameraImage from "@/components/camera/AutoUpdatingCameraImage";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useCameraActivity } from "@/hooks/use-camera-activity";
import { cn } from "@/lib/utils";
import Heading from "@/components/ui/heading";
import { Toaster } from "@/components/ui/sonner";
import { CameraConfig, FrigateConfig } from "@/types/frigateConfig";
import { getIconForLabel } from "@/utils/iconUtil";
import { getTranslatedLabel } from "@/utils/i18n";
import { ObjectType } from "@/types/ws";
import WsMessageFeed from "@/components/ws/WsMessageFeed";
import { ConfigSectionTemplate } from "@/components/config-form/sections/ConfigSectionTemplate";

import { LuExternalLink, LuInfo, LuSettings } from "react-icons/lu";
import { LuSquare } from "react-icons/lu";
import { MdReplay } from "react-icons/md";
import { isDesktop, isMobile } from "react-device-detect";
import Logo from "@/components/Logo";
import { Separator } from "@/components/ui/separator";
import { useDocDomain } from "@/hooks/use-doc-domain";
import DebugDrawingLayer from "@/components/overlay/DebugDrawingLayer";
import { IoMdArrowRoundBack } from "react-icons/io";

type DebugReplayStatus = {
  active: boolean;
  replay_camera: string | null;
  source_camera: string | null;
  start_time: number | null;
  end_time: number | null;
  live_ready: boolean;
};

type DebugOptions = {
  bbox: boolean;
  timestamp: boolean;
  zones: boolean;
  mask: boolean;
  motion: boolean;
  regions: boolean;
  paths: boolean;
};

const DEFAULT_OPTIONS: DebugOptions = {
  bbox: true,
  timestamp: false,
  zones: false,
  mask: false,
  motion: true,
  regions: false,
  paths: false,
};

const DEBUG_OPTION_KEYS: (keyof DebugOptions)[] = [
  "bbox",
  "timestamp",
  "zones",
  "mask",
  "motion",
  "regions",
  "paths",
];

const DEBUG_OPTION_I18N_KEY: Record<keyof DebugOptions, string> = {
  bbox: "boundingBoxes",
  timestamp: "timestamp",
  zones: "zones",
  mask: "mask",
  motion: "motion",
  regions: "regions",
  paths: "paths",
};

const REPLAY_INIT_SKELETON_TIMEOUT_MS = 8000;

export default function Replay() {
  const { t } = useTranslation(["views/replay", "views/settings", "common"]);
  const navigate = useNavigate();
  const { getLocaleDocUrl } = useDocDomain();

  const {
    data: status,
    mutate: refreshStatus,
    isLoading,
  } = useSWR<DebugReplayStatus>("debug_replay/status", {
    refreshInterval: 1000,
  });
  const [isInitializing, setIsInitializing] = useState(true);

  // Refresh status immediately on mount to avoid showing "no session" briefly
  useEffect(() => {
    const initializeStatus = async () => {
      await refreshStatus();
      setIsInitializing(false);
    };
    initializeStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (status?.live_ready) {
      setShowReplayInitSkeleton(false);
    }
  }, [status?.live_ready]);

  const [options, setOptions] = useState<DebugOptions>(DEFAULT_OPTIONS);
  const [isStopping, setIsStopping] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);

  const searchParams = useMemo(() => {
    const params = new URLSearchParams();
    for (const key of DEBUG_OPTION_KEYS) {
      params.set(key, options[key] ? "1" : "0");
    }
    return params;
  }, [options]);

  const handleSetOption = useCallback(
    (key: keyof DebugOptions, value: boolean) => {
      setOptions((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleStop = useCallback(() => {
    setIsStopping(true);
    axios
      .post("debug_replay/stop")
      .then(() => {
        toast.success(t("dialog.toast.stopped"), {
          position: "top-center",
        });
        refreshStatus();
        navigate("/review");
      })
      .catch((error) => {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unknown error";
        toast.error(t("dialog.toast.stopError", { error: errorMessage }), {
          position: "top-center",
        });
      })
      .finally(() => {
        setIsStopping(false);
      });
  }, [navigate, refreshStatus, t]);

  // Camera activity for the replay camera
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });
  const replayCameraName = status?.replay_camera ?? "";
  const replayCameraConfig = replayCameraName
    ? config?.cameras?.[replayCameraName]
    : undefined;

  const { objects } = useCameraActivity(replayCameraConfig);

  const [showReplayInitSkeleton, setShowReplayInitSkeleton] = useState(false);

  // debug draw
  const containerRef = useRef<HTMLDivElement>(null);
  const [debugDraw, setDebugDraw] = useState(false);

  useEffect(() => {
    if (!status?.active || !status.replay_camera) {
      setShowReplayInitSkeleton(false);
      return;
    }

    setShowReplayInitSkeleton(true);

    const timeout = window.setTimeout(() => {
      setShowReplayInitSkeleton(false);
    }, REPLAY_INIT_SKELETON_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [status?.active, status?.replay_camera]);

  useEffect(() => {
    if (status?.live_ready) {
      setShowReplayInitSkeleton(false);
    }
  }, [status?.live_ready]);

  // Format time range for display
  const timeRangeDisplay = useMemo(() => {
    if (!status?.start_time || !status?.end_time) return "";
    const start = new Date(status.start_time * 1000).toLocaleString();
    const end = new Date(status.end_time * 1000).toLocaleString();
    return `${start} — ${end}`;
  }, [status]);

  // Show loading state
  if (isInitializing || (isLoading && !status?.active)) {
    return (
      <div className="flex size-full items-center justify-center">
        <ActivityIndicator />
      </div>
    );
  }

  // No active session
  if (!status?.active) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-4 p-8">
        <MdReplay className="size-12" />
        <Heading as="h2" className="text-center">
          {t("page.noSession")}
        </Heading>
        <p className="max-w-md text-center text-muted-foreground">
          {t("page.noSessionDesc")}
        </p>
        <Button variant="default" onClick={() => navigate("/review")}>
          {t("page.goToRecordings")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex size-full flex-col overflow-hidden">
      <Toaster position="top-center" closeButton={true} />

      {/* Top bar */}
      <div className="flex min-h-12 items-center justify-between border-b border-secondary px-2 py-2 md:min-h-16 md:px-3 md:py-3">
        {isMobile && (
          <Logo className="absolute inset-x-1/2 h-8 -translate-x-1/2" />
        )}
        <Button
          className="flex items-center gap-2.5 rounded-lg"
          aria-label={t("label.back", { ns: "common" })}
          size="sm"
          onClick={() => navigate(-1)}
        >
          <IoMdArrowRoundBack className="size-5 text-secondary-foreground" />
          {isDesktop && (
            <div className="text-primary">
              {t("button.back", { ns: "common" })}
            </div>
          )}
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => setConfigDialogOpen(true)}
          >
            <LuSettings className="size-4" />
            <span className="hidden md:inline">{t("page.configuration")}</span>
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="flex items-center gap-2 text-white"
                disabled={isStopping}
              >
                {isStopping && <ActivityIndicator className="size-4" />}
                <span className="hidden md:inline">{t("page.stopReplay")}</span>
                <LuSquare className="size-4 md:hidden" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("page.confirmStop.title")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("page.confirmStop.description")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  {t("page.confirmStop.cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleStop}
                  className={cn(
                    buttonVariants({ variant: "destructive" }),
                    "text-white",
                  )}
                >
                  {t("page.confirmStop.confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden pb-2 md:flex-row">
        {/* Camera feed */}
        <div className="flex max-h-[40%] px-2 pt-2 md:h-dvh md:max-h-full md:w-7/12 md:grow md:px-4 md:pt-2">
          {isStopping ? (
            <div className="flex size-full items-center justify-center rounded-lg bg-background_alt">
              <div className="flex flex-col items-center justify-center gap-2">
                <ActivityIndicator className="size-8" />
                <div className="text-secondary-foreground">
                  {t("page.stoppingReplay")}
                </div>
              </div>
            </div>
          ) : (
            status.replay_camera && (
              <div className="relative size-full min-h-10" ref={containerRef}>
                <AutoUpdatingCameraImage
                  className="size-full"
                  cameraClasses="relative w-full h-full flex flex-col justify-start"
                  searchParams={searchParams}
                  camera={status.replay_camera}
                  showFps={false}
                />
                {debugDraw && (
                  <DebugDrawingLayer
                    containerRef={containerRef}
                    cameraWidth={
                      config?.cameras?.[status.source_camera ?? ""]?.detect
                        .width ?? 1280
                    }
                    cameraHeight={
                      config?.cameras?.[status.source_camera ?? ""]?.detect
                        .height ?? 720
                    }
                  />
                )}
                {showReplayInitSkeleton && (
                  <div className="pointer-events-none absolute inset-0 z-10 size-full rounded-lg bg-background">
                    <Skeleton className="size-full rounded-lg" />
                    <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-2">
                      <ActivityIndicator className="size-8" />
                      <div className="text-secondary-foreground">
                        {t("page.initializingReplay")}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {/* Side panel */}
        <div className="scrollbar-container order-last mb-2 mt-2 flex h-full w-full flex-col overflow-y-auto rounded-lg border-[1px] border-secondary-foreground bg-background_alt p-2 md:order-none md:mb-0 md:mr-2 md:mt-0 md:w-4/12">
          <div className="mb-5 flex flex-col space-y-2">
            <Heading as="h3" className="mb-0">
              {t("title")}
            </Heading>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="smart-capitalize">{status.source_camera}</span>
              {timeRangeDisplay && (
                <>
                  <span className="hidden md:inline">•</span>
                  <span className="hidden md:inline">{timeRangeDisplay}</span>
                </>
              )}
            </div>
            <div className="mb-5 space-y-3 text-sm text-muted-foreground">
              <p>{t("description")}</p>
            </div>
          </div>
          <Tabs defaultValue="debug" className="flex h-full w-full flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="debug">
                {t("debug.debugging", { ns: "views/settings" })}
              </TabsTrigger>
              <TabsTrigger value="objects">{t("page.objects")}</TabsTrigger>
              <TabsTrigger value="messages">
                {t("websocket_messages")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="debug" className="mt-2">
              <div className="mt-2 space-y-6">
                <div className="my-2.5 flex flex-col gap-2.5">
                  {DEBUG_OPTION_KEYS.map((key) => {
                    const i18nKey = DEBUG_OPTION_I18N_KEY[key];
                    return (
                      <div
                        key={key}
                        className="flex w-full flex-row items-center justify-between"
                      >
                        <div className="mb-1 flex flex-col">
                          <div className="flex items-center gap-2">
                            <Label
                              className="mb-0 cursor-pointer text-primary smart-capitalize"
                              htmlFor={`debug-${key}`}
                            >
                              {t(`debug.${i18nKey}.title`, {
                                ns: "views/settings",
                              })}
                            </Label>
                            {(key === "bbox" ||
                              key === "motion" ||
                              key === "regions" ||
                              key === "paths") && (
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
                                  {key === "bbox" ? (
                                    <>
                                      <p className="mb-2">
                                        <strong>
                                          {t(
                                            "debug.boundingBoxes.colors.label",
                                            {
                                              ns: "views/settings",
                                            },
                                          )}
                                        </strong>
                                      </p>
                                      <ul className="list-disc space-y-1 pl-5">
                                        <Trans ns="views/settings">
                                          debug.boundingBoxes.colors.info
                                        </Trans>
                                      </ul>
                                    </>
                                  ) : (
                                    <Trans ns="views/settings">
                                      {`debug.${i18nKey}.tips`}
                                    </Trans>
                                  )}
                                </PopoverContent>
                              </Popover>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {t(`debug.${i18nKey}.desc`, {
                              ns: "views/settings",
                            })}
                          </div>
                        </div>
                        <Switch
                          id={`debug-${key}`}
                          className="ml-1"
                          checked={options[key]}
                          onCheckedChange={(checked) =>
                            handleSetOption(key, checked)
                          }
                        />
                      </div>
                    );
                  })}
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
                              {t("debug.objectShapeFilterDrawing.title", {
                                ns: "views/settings",
                              })}
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
                                {t("debug.objectShapeFilterDrawing.tips", {
                                  ns: "views/settings",
                                })}
                                <div className="mt-2 flex items-center text-primary">
                                  <Link
                                    to={getLocaleDocUrl(
                                      "configuration/object_filters#object-shape",
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline"
                                  >
                                    {t("readTheDocumentation", {
                                      ns: "common",
                                    })}
                                    <LuExternalLink className="ml-2 inline-flex size-3" />
                                  </Link>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {t("debug.objectShapeFilterDrawing.desc", {
                              ns: "views/settings",
                            })}
                          </div>
                        </div>
                        <Switch
                          key={"draw"}
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
            <TabsContent value="objects" className="mt-2">
              <ObjectList
                cameraConfig={replayCameraConfig}
                objects={objects}
                config={config}
              />
            </TabsContent>
            <TabsContent
              value="messages"
              className="mt-2 flex min-h-0 flex-1 flex-col"
            >
              <div className="flex h-full flex-col overflow-hidden rounded-md border border-secondary">
                <WsMessageFeed
                  maxSize={2000}
                  lockedCamera={status.replay_camera ?? undefined}
                  showCameraBadge={false}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="scrollbar-container max-h-[90dvh] overflow-y-auto sm:max-w-xl md:max-w-3xl lg:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t("page.configuration")}</DialogTitle>
            <DialogDescription className="mb-5">
              {t("page.configurationDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <ConfigSectionTemplate
              sectionKey="motion"
              level="replay"
              cameraName={status.replay_camera ?? undefined}
              skipSave
              noStickyButtons
              requiresRestart={false}
              collapsible
              defaultCollapsed={false}
              showTitle
              showOverrideIndicator={false}
            />
            <ConfigSectionTemplate
              sectionKey="objects"
              level="replay"
              cameraName={status.replay_camera ?? undefined}
              skipSave
              noStickyButtons
              requiresRestart={false}
              collapsible
              defaultCollapsed={false}
              showTitle
              showOverrideIndicator={false}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type ObjectListProps = {
  cameraConfig?: CameraConfig;
  objects?: ObjectType[];
  config?: FrigateConfig;
};

function ObjectList({ cameraConfig, objects, config }: ObjectListProps) {
  const { t } = useTranslation(["views/settings"]);

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

  if (!objects || objects.length === 0) {
    return (
      <div className="p-3 text-center text-sm text-muted-foreground">
        {t("debug.noObjects", { ns: "views/settings" })}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {objects.map((obj: ObjectType) => {
        return (
          <div
            key={obj.id}
            className="flex flex-col rounded-lg bg-secondary/30 p-2"
          >
            <div className="flex flex-row items-center gap-3 pb-1">
              <div
                className="rounded-lg p-2"
                style={{
                  backgroundColor: obj.stationary
                    ? "rgb(110,110,110)"
                    : getColorForObjectName(obj.label),
                }}
              >
                {getIconForLabel(obj.label, "object", "size-4 text-white")}
              </div>
              <div className="text-sm font-medium">
                {getTranslatedLabel(obj.label)}
              </div>
            </div>
            <div className="flex flex-col gap-1 pl-1 text-xs text-primary-variant">
              <div className="flex items-center justify-between">
                <span>
                  {t("debug.objectShapeFilterDrawing.score", {
                    ns: "views/settings",
                  })}
                  :
                </span>
                <span className="text-primary">
                  {obj.score ? (obj.score * 100).toFixed(1) : "-"}%
                </span>
              </div>
              {obj.ratio && (
                <div className="flex items-center justify-between">
                  <span>
                    {t("debug.objectShapeFilterDrawing.ratio", {
                      ns: "views/settings",
                    })}
                    :
                  </span>
                  <span className="text-primary">{obj.ratio.toFixed(2)}</span>
                </div>
              )}
              {obj.area && cameraConfig && (
                <div className="flex items-center justify-between">
                  <span>
                    {t("debug.objectShapeFilterDrawing.area", {
                      ns: "views/settings",
                    })}
                    :
                  </span>
                  <span className="text-primary">
                    {obj.area} px (
                    {(
                      (obj.area /
                        (cameraConfig.detect.width *
                          cameraConfig.detect.height)) *
                      100
                    ).toFixed(2)}
                    %)
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
