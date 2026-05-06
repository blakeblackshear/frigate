import { useFrigateStats } from "@/api/ws";
import { CameraLineGraph } from "@/components/graph/LineGraph";
import CameraInfoDialog from "@/components/overlay/CameraInfoDialog";
import { ConnectionQualityIndicator } from "@/components/camera/ConnectionQualityIndicator";
import { EmptyCard } from "@/components/card/EmptyCard";
import { Skeleton } from "@/components/ui/skeleton";
import { FrigateConfig } from "@/types/frigateConfig";
import { FrigateStats } from "@/types/stats";
import {
  Fragment,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { BsFillCameraVideoOffFill } from "react-icons/bs";
import { MdInfo } from "react-icons/md";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useSWR from "swr";
import { useTranslation } from "react-i18next";
import { CameraNameLabel } from "@/components/camera/FriendlyNameLabel";
import { resolveCameraName } from "@/hooks/use-camera-friendly-name";

type CameraMetricsProps = {
  lastUpdated: number;
  setLastUpdated: (last: number) => void;
  isActive: boolean;
};
export default function CameraMetrics({
  lastUpdated,
  setLastUpdated,
  isActive,
}: CameraMetricsProps) {
  const { data: config } = useSWR<FrigateConfig>("config");
  const { t } = useTranslation(["views/system"]);
  // camera info dialog

  const getCameraName = useCallback(
    (cameraId: string) => resolveCameraName(config, cameraId),
    [config],
  );

  const [showCameraInfoDialog, setShowCameraInfoDialog] = useState(false);
  const [probeCameraName, setProbeCameraName] = useState<string>();

  // stats

  const { data: initialStats, mutate: refreshStats } = useSWR<FrigateStats[]>(
    [
      "stats/history",
      {
        keys: "cameras.camera_fps,cameras.detection_fps,cameras.skipped_fps,cameras.ffmpeg_cpu,cameras.capture_cpu,cameras.detect_cpu,cameras.connection_quality,cameras.expected_fps,cameras.reconnects_last_hour,cameras.stalls_last_hour,camera_fps,detection_fps,skipped_fps,service.last_updated",
      },
    ],
    {
      revalidateOnFocus: false,
    },
  );

  const [statsHistory, setStatsHistory] = useState<FrigateStats[]>([]);
  const updatedStats = useFrigateStats();

  useEffect(() => {
    if (initialStats == undefined || initialStats.length == 0) {
      return;
    }

    if (statsHistory.length == 0) {
      startTransition(() => setStatsHistory(initialStats));
      return;
    }

    if (!isActive || !updatedStats) {
      return;
    }

    if (updatedStats.service.last_updated > lastUpdated) {
      setStatsHistory([...statsHistory.slice(1), updatedStats]);
      setLastUpdated(updatedStats.service.last_updated);
    }
  }, [
    initialStats,
    updatedStats,
    statsHistory,
    lastUpdated,
    setLastUpdated,
    isActive,
  ]);

  useEffect(() => {
    if (isActive && statsHistory.length > 0) {
      refreshStats().then((freshStats) => {
        if (freshStats && freshStats.length > 0) {
          setStatsHistory(freshStats);
        }
      });
    }
    // only re-fetch when tab becomes active, not on data changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // timestamps

  const updateTimes = useMemo(
    () => statsHistory.map((stats) => stats.service.last_updated),
    [statsHistory],
  );

  // stats data

  const overallFpsSeries = useMemo(() => {
    if (!statsHistory) {
      return [];
    }

    const series: {
      [key: string]: { name: string; data: { x: number; y: number }[] };
    } = {};

    series["overall_fps"] = {
      name: t("cameras.label.overallFramesPerSecond"),
      data: [],
    };
    series["overall_dps"] = {
      name: t("cameras.label.overallDetectionsPerSecond"),
      data: [],
    };
    series["overall_skipped_dps"] = {
      name: t("cameras.label.overallSkippedDetectionsPerSecond"),
      data: [],
    };

    statsHistory.forEach((stats, statsIdx) => {
      if (!stats) {
        return;
      }

      series["overall_fps"].data.push({
        x: statsIdx,
        y: stats.camera_fps,
      });

      series["overall_dps"].data.push({
        x: statsIdx,
        y: stats.detection_fps,
      });

      series["overall_skipped_dps"].data.push({
        x: statsIdx,
        y: stats.skipped_fps,
      });
    });
    return Object.values(series);
  }, [statsHistory, t]);

  const cameraCpuSeries = useMemo(() => {
    if (!statsHistory || statsHistory.length == 0) {
      return {};
    }

    const series: {
      [cam: string]: {
        [key: string]: { name: string; data: { x: number; y: string }[] };
      };
    } = {};

    statsHistory.forEach((stats, statsIdx) => {
      if (!stats) {
        return;
      }

      Object.entries(stats.cameras).forEach(([key, camStats]) => {
        if (!camStats || !config?.cameras[key]?.enabled) {
          return;
        }

        if (!(key in series)) {
          const camName = getCameraName(key);
          series[key] = {};
          series[key]["ffmpeg"] = {
            name: t("cameras.label.cameraFfmpeg", { camName: camName }),
            data: [],
          };
          series[key]["capture"] = {
            name: t("cameras.label.cameraCapture", { camName: camName }),
            data: [],
          };
          series[key]["detect"] = {
            name: t("cameras.label.cameraDetect", { camName: camName }),
            data: [],
          };
        }

        series[key]["ffmpeg"].data.push({
          x: statsIdx,
          y: camStats.ffmpeg_cpu ?? "0",
        });
        series[key]["capture"].data.push({
          x: statsIdx,
          y: camStats.capture_cpu ?? "0",
        });
        series[key]["detect"].data.push({
          x: statsIdx,
          y: camStats.detect_cpu ?? "0",
        });
      });
    });
    return series;
  }, [config, getCameraName, statsHistory, t]);

  const cameraFpsSeries = useMemo(() => {
    if (!statsHistory) {
      return {};
    }

    const series: {
      [cam: string]: {
        [key: string]: { name: string; data: { x: number; y: number }[] };
      };
    } = {};

    statsHistory.forEach((stats, statsIdx) => {
      if (!stats) {
        return;
      }

      Object.entries(stats.cameras).forEach(([key, camStats]) => {
        if (!camStats) {
          return;
        }

        if (!(key in series)) {
          const camName = getCameraName(key);
          series[key] = {};
          series[key]["fps"] = {
            name: t("cameras.label.cameraFramesPerSecond", {
              camName: camName,
            }),
            data: [],
          };
          series[key]["det"] = {
            name: t("cameras.label.cameraDetectionsPerSecond", {
              camName: camName,
            }),
            data: [],
          };
          series[key]["skip"] = {
            name: t("cameras.label.cameraSkippedDetectionsPerSecond", {
              camName: camName,
            }),
            data: [],
          };
        }

        series[key]["fps"].data.push({
          x: statsIdx,
          y: camStats.camera_fps,
        });
        series[key]["det"].data.push({
          x: statsIdx,
          y: camStats.detection_fps,
        });
        series[key]["skip"].data.push({
          x: statsIdx,
          y: camStats.skipped_fps,
        });
      });
    });
    return series;
  }, [getCameraName, statsHistory, t]);

  useEffect(() => {
    if (!showCameraInfoDialog) {
      setProbeCameraName("");
    }
  }, [showCameraInfoDialog]);

  if (config && Object.keys(config.cameras).length === 0) {
    return (
      <div className="flex size-full items-center justify-center">
        <EmptyCard
          icon={<BsFillCameraVideoOffFill className="size-8" />}
          title={t("cameras.noCameras.title")}
        />
      </div>
    );
  }

  return (
    <div className="scrollbar-container mt-4 flex size-full flex-col gap-3 overflow-y-auto">
      <div className="text-sm font-medium text-muted-foreground">
        {t("cameras.overview")}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3">
        {statsHistory.length != 0 ? (
          <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
            <div className="mb-5">{t("cameras.framesAndDetections")}</div>
            <CameraLineGraph
              graphId="overall-stats"
              unit=""
              dataLabels={["camera", "detect", "skipped"]}
              updateTimes={updateTimes}
              data={overallFpsSeries}
              isActive={isActive}
            />
          </div>
        ) : (
          <Skeleton className="h-32 w-full rounded-lg md:rounded-2xl" />
        )}
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {config &&
          Object.values(config.cameras).map((camera) => {
            if (camera.enabled) {
              return (
                <Fragment key={camera.name}>
                  {probeCameraName == camera.name && (
                    <CameraInfoDialog
                      camera={camera}
                      showCameraInfoDialog={showCameraInfoDialog}
                      setShowCameraInfoDialog={setShowCameraInfoDialog}
                    />
                  )}
                  <div className="flex w-full flex-col gap-3">
                    <div className="flex flex-row items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-muted-foreground smart-capitalize">
                          <CameraNameLabel camera={camera} />
                        </div>
                        {statsHistory.length > 0 &&
                          statsHistory[statsHistory.length - 1]?.cameras[
                            camera.name
                          ] && (
                            <ConnectionQualityIndicator
                              quality={
                                statsHistory[statsHistory.length - 1]?.cameras[
                                  camera.name
                                ]?.connection_quality
                              }
                              expectedFps={
                                statsHistory[statsHistory.length - 1]?.cameras[
                                  camera.name
                                ]?.expected_fps || 0
                              }
                              reconnects={
                                statsHistory[statsHistory.length - 1]?.cameras[
                                  camera.name
                                ]?.reconnects_last_hour || 0
                              }
                              stalls={
                                statsHistory[statsHistory.length - 1]?.cameras[
                                  camera.name
                                ]?.stalls_last_hour || 0
                              }
                            />
                          )}
                      </div>
                      <Tooltip>
                        <TooltipTrigger>
                          <MdInfo
                            className="size-5 cursor-pointer text-muted-foreground"
                            onClick={() => {
                              setShowCameraInfoDialog(true);
                              setProbeCameraName(camera.name);
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          {t("cameras.info.tips.title")}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div
                      key={camera.name}
                      className="grid gap-2 sm:grid-cols-2"
                    >
                      {Object.keys(cameraCpuSeries).includes(camera.name) ? (
                        <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
                          <div className="mb-5">CPU</div>
                          <CameraLineGraph
                            graphId={`${camera.name}-cpu`}
                            unit="%"
                            dataLabels={["ffmpeg", "capture", "detect"]}
                            updateTimes={updateTimes}
                            data={Object.values(
                              cameraCpuSeries[camera.name] || {},
                            )}
                            isActive={isActive}
                          />
                        </div>
                      ) : (
                        <Skeleton className="aspect-video size-full" />
                      )}
                      {Object.keys(cameraFpsSeries).includes(camera.name) ? (
                        <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
                          <div className="mb-5">
                            {t("cameras.framesAndDetections")}
                          </div>
                          <CameraLineGraph
                            graphId={`${camera.name}-dps`}
                            unit=""
                            dataLabels={["camera", "detect", "skipped"]}
                            updateTimes={updateTimes}
                            data={Object.values(
                              cameraFpsSeries[camera.name] || {},
                            )}
                            isActive={isActive}
                          />
                        </div>
                      ) : (
                        <Skeleton className="aspect-video size-full" />
                      )}
                    </div>
                  </div>
                </Fragment>
              );
            }

            return null;
          })}
      </div>
    </div>
  );
}
